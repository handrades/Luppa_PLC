import * as Joi from "joi";

export const csvRowSchema = Joi.object({
  site_name: Joi.string().max(100).required().messages({
    "string.empty": "Site name is required",
    "string.max": "Site name must be less than 100 characters",
  }),
  cell_name: Joi.string().max(100).required().messages({
    "string.empty": "Cell name is required",
    "string.max": "Cell name must be less than 100 characters",
  }),
  cell_type: Joi.string()
    .valid("production", "warehouse", "testing", "packaging")
    .allow("", null)
    .optional(),
  equipment_name: Joi.string().max(100).required().messages({
    "string.empty": "Equipment name is required",
    "string.max": "Equipment name must be less than 100 characters",
  }),
  equipment_type: Joi.string()
    .valid("plc", "hmi", "robot", "sensor", "controller")
    .allow("", null)
    .optional(),
  tag_id: Joi.string().max(100).required().messages({
    "string.empty": "Tag ID is required",
    "string.max": "Tag ID must be less than 100 characters",
    "any.required": "Tag ID is required",
  }),
  description: Joi.string().required().messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),
  make: Joi.string().max(100).required().messages({
    "string.empty": "Make is required",
    "string.max": "Make must be less than 100 characters",
  }),
  model: Joi.string().max(100).required().messages({
    "string.empty": "Model is required",
    "string.max": "Model must be less than 100 characters",
  }),
  ip_address: Joi.string()
    .ip({ version: ["ipv4", "ipv6"] })
    .allow("", null)
    .optional()
    .messages({
      "string.ip": "Invalid IP address format",
    }),
  firmware_version: Joi.string().max(50).allow("", null).optional(),
  tags: Joi.string().allow("", null).optional(),
});

export const importOptionsSchema = Joi.object({
  createMissing: Joi.boolean().required(),
  mergeStrategy: Joi.string().valid("skip", "update", "replace").required(),
  validateOnly: Joi.boolean().required(),
  userId: Joi.string().uuid().optional(), // userId is added by the route handler from req.user
});

export const importOptionsSchemaForRoutes = Joi.object({
  createMissing: Joi.boolean().required(),
  mergeStrategy: Joi.string().valid("skip", "update", "replace").required(),
  validateOnly: Joi.boolean().required(),
  // userId is not required in request body as it's added by the route handler
});

export const exportFiltersSchema = Joi.object({
  siteIds: Joi.array().items(Joi.string().uuid()).optional(),
  cellIds: Joi.array().items(Joi.string().uuid()).optional(),
  equipmentIds: Joi.array().items(Joi.string().uuid()).optional(),
  cellTypes: Joi.array()
    .items(
      Joi.string().valid("production", "warehouse", "testing", "packaging"),
    )
    .optional(),
  equipmentTypes: Joi.array()
    .items(Joi.string().valid("plc", "hmi", "robot", "sensor", "controller"))
    .optional(),
  dateRange: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().greater(Joi.ref("start")).required(),
  }).optional(),
  ipRange: Joi.string()
    .pattern(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "IP range must be in CIDR notation (e.g., 192.168.1.0/24)",
    }),
  tags: Joi.array().items(Joi.string()).optional(),
});

export const exportOptionsSchema = Joi.object({
  format: Joi.string().valid("csv", "json").required(),
  includeHierarchy: Joi.boolean().required(),
  includeTags: Joi.boolean().required(),
  includeAuditInfo: Joi.boolean().required(),
});

export const importHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid("pending", "processing", "completed", "failed", "rolled_back")
    .optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date()
    .when("startDate", {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref("startDate")),
    })
    .optional(),
});
