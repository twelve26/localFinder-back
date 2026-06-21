const express = require("express");
const cors = require("cors");
const { properties } = require("./data");
const {
  createContactRequest,
  getStoreInfo,
  getStorageMode,
  listContactRequests
} = require("./contactRequestsStore");

const app = express();
const VALID_TYPES = new Set(["APARTMENT", "HOUSE", "ROOM", "STUDIO"]);
const VALID_SORTS = new Set(["price_asc", "price_desc", "newest", "distance_asc"]);

app.use(cors());
app.use(express.json());
app.use(simulatedLatency);
app.use(forcedErrors);

app.get("/", (_req, res) => {
  res.json({
    name: "LocalFinder Backend",
    status: "ok",
    storage: getStorageMode(),
    endpoints: [
      "GET /health",
      "GET /debug/storage",
      "GET /properties",
      "GET /properties/:id",
      "GET /properties/recommended",
      "POST /contact-requests",
      "GET /contact-requests",
      "GET /config"
    ]
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "localfinder-backend",
    storage: getStorageMode(),
    timestamp: new Date().toISOString()
  });
});

app.get("/debug/storage", async (_req, res, next) => {
  try {
    res.json(await getStoreInfo());
  } catch (error) {
    next(error);
  }
});

app.get("/config", (_req, res) => {
  res.json({
    minSupportedVersion: "1.0.0",
    showRecommendedSection: true,
    enableComparisonFeature: true,
    enableContactRequests: true,
    maintenanceMode: false
  });
});

app.get("/properties/recommended", (req, res) => {
  const city = optionalString(req.query.city);
  const items = properties
    .filter((property) => !city || equalsIgnoreCase(property.city, city))
    .filter((property) => property.isAvailable)
    .sort((a, b) => b.owner.rating - a.owner.rating || a.distanceToCenterKm - b.distanceToCenterKm)
    .slice(0, 8)
    .map(toRecommendedDto);

  res.json({ items });
});

app.get("/properties", (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = Math.min(parsePositiveInteger(req.query.limit, 20), 50);
  const sort = optionalString(req.query.sort) || "newest";

  if (req.query.type && !VALID_TYPES.has(String(req.query.type).toUpperCase())) {
    return sendError(res, 400, "VALIDATION_ERROR", "Tipo de propriedade invalido.");
  }

  if (!VALID_SORTS.has(sort)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Ordenamiento invalido.");
  }

  const filtered = applyPropertyFilters(properties, req.query);
  const sorted = sortProperties(filtered, sort);
  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit).map(toListDto);

  res.json({
    items,
    page,
    limit,
    total: sorted.length,
    hasNextPage: start + limit < sorted.length
  });
});

app.get("/properties/:id", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);

  if (!property) {
    return sendError(res, 404, "PROPERTY_NOT_FOUND", "Propiedad no encontrada.");
  }

  const similarProperties = properties
    .filter((item) => item.id !== property.id)
    .filter((item) => item.type === property.type || item.neighborhood === property.neighborhood)
    .slice(0, 3)
    .map((item) => item.id);

  res.json({
    ...property,
    similarProperties
  });
});

app.post("/contact-requests", async (req, res, next) => {
  try {
    const { propertyId, userName, email, phone, message } = req.body || {};

    if (!propertyId || !userName || !email || !message) {
      return sendError(res, 400, "VALIDATION_ERROR", "Campos obligatorios ausentes.");
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, "INVALID_EMAIL", "Email invalido.");
    }

    const property = properties.find((item) => item.id === propertyId);

    if (!property) {
      return sendError(res, 404, "PROPERTY_NOT_FOUND", "Propiedad no encontrada.");
    }

    if (!property.isAvailable) {
      return sendError(res, 409, "PROPERTY_NOT_AVAILABLE", "Esta propriedade nao esta mais disponivel.");
    }

    const contactRequest = await createContactRequest({
      propertyId,
      userName,
      email,
      phone,
      message
    });

    res.status(201).json({
      id: contactRequest.id,
      propertyId: contactRequest.propertyId,
      status: contactRequest.status,
      createdAt: contactRequest.createdAt
    });
  } catch (error) {
    next(error);
  }
});

app.get("/contact-requests", async (_req, res, next) => {
  try {
    const contactRequests = await listContactRequests();
    const items = contactRequests.map((request) => {
      const property = properties.find((item) => item.id === request.propertyId);

      return {
        id: request.id,
        propertyId: request.propertyId,
        propertyTitle: property ? property.title : null,
        status: request.status,
        createdAt: request.createdAt
      };
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Endpoint no encontrado.");
});

app.use((err, _req, res, _next) => {
  console.error(err);
  sendError(res, 500, "SERVER_ERROR", "Tuvimos un problema inesperado.");
});

function applyPropertyFilters(source, query) {
  const city = optionalString(query.city);
  const minPrice = optionalNumber(query.minPrice);
  const maxPrice = optionalNumber(query.maxPrice);
  const type = optionalString(query.type);
  const bedrooms = optionalNumber(query.bedrooms);
  const allowsPets = optionalBoolean(query.allowsPets);
  const furnished = optionalBoolean(query.furnished);

  return source.filter((property) => {
    if (city && !equalsIgnoreCase(property.city, city)) return false;
    if (minPrice !== null && property.price < minPrice) return false;
    if (maxPrice !== null && property.price > maxPrice) return false;
    if (type && property.type !== type.toUpperCase()) return false;
    if (bedrooms !== null && property.bedrooms < bedrooms) return false;
    if (allowsPets === true && !property.allowsPets) return false;
    if (furnished === true && !property.isFurnished) return false;
    return true;
  });
}

function sortProperties(source, sort) {
  return [...source].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "distance_asc":
        return a.distanceToCenterKm - b.distanceToCenterKm;
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

function toListDto(property) {
  return {
    id: property.id,
    title: property.title,
    city: property.city,
    neighborhood: property.neighborhood,
    price: property.price,
    currency: property.currency,
    type: property.type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaM2: property.areaM2,
    isFurnished: property.isFurnished,
    allowsPets: property.allowsPets,
    thumbnailUrl: property.images[0]
  };
}

function toRecommendedDto(property) {
  return {
    id: property.id,
    title: property.title,
    city: property.city,
    neighborhood: property.neighborhood,
    price: property.price,
    currency: property.currency,
    thumbnailUrl: property.images[0]
  };
}

function forcedErrors(req, res, next) {
  if (String(req.query.forceError || "") === "500") {
    return sendError(res, 500, "SERVER_ERROR", "Tuvimos un problema inesperado.");
  }

  next();
}

function simulatedLatency(req, _res, next) {
  const latencyQuery = req.query.latencyMs || req.query.latency;
  let delay = 0;

  if (latencyQuery === "random") {
    delay = 300 + Math.floor(Math.random() * 1201);
  } else if (latencyQuery !== undefined) {
    delay = clamp(parsePositiveInteger(latencyQuery, 0), 0, 1500);
  }

  if (delay > 0) {
    setTimeout(next, delay);
    return;
  }

  next();
}

function sendError(res, status, code, message) {
  res.status(status).json({ code, message });
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).toLowerCase() === "true";
}

function optionalString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function equalsIgnoreCase(left, right) {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = app;
