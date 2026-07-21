const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} content - HTML content to sanitize
 * @returns {string} - Sanitized content
 */
const sanitizeContent = (content) => {
  if (typeof content !== 'string') {
    return content;
  }

  return sanitizeHtml(content, {
    allowedTags: ['b', 'i', 'em', 'strong', 'u', 'a', 'code', 'pre', 'br'],
    allowedAttributes: {
      'a': ['href', 'title']
    },
    disallowedTagsMode: 'discard'
  });
};

/**
 * Validation schemas for common operations
 */
const schemas = {
  // User authentication schemas
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required'
    })
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(12)
      .pattern(/[A-Z]/)
      .pattern(/[a-z]/)
      .pattern(/[0-9]/)
      .pattern(/[!@#$%^&*]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, numbers, and symbols',
        'string.min': 'Password must be at least 12 characters'
      }),
    name: Joi.string().max(100).required(),
    role: Joi.string().valid('user', 'admin').required()
  }),

  // Message schema
  createMessage: Joi.object({
    content: Joi.string().max(10000).required().messages({
      'string.max': 'Message cannot exceed 10,000 characters'
    }),
    channelId: Joi.number().integer().required(),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().max(255),
        url: Joi.string().uri()
      })
    ).max(5).messages({
      'array.max': 'Cannot attach more than 5 files'
    })
  }),

  // Update message schema
  updateMessage: Joi.object({
    content: Joi.string().max(10000).required(),
    messageId: Joi.number().integer().required()
  }),

  // Product schema
  createProduct: Joi.object({
    name: Joi.string().max(255).required(),
    sku: Joi.string().max(50).required().pattern(/^[A-Z0-9-]+$/).messages({
      'string.pattern.base': 'SKU must contain only uppercase letters, numbers, and hyphens'
    }),
    description: Joi.string().max(5000),
    price: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Price must be greater than 0'
    }),
    stock: Joi.number().integer().min(0).required(),
    categoryId: Joi.number().integer().required()
  }),

  // Channel schema
  createChannel: Joi.object({
    name: Joi.string().max(100).required(),
    description: Joi.string().max(500),
    isPrivate: Joi.boolean(),
    memberIds: Joi.array().items(Joi.number().integer()).required().messages({
      'array.base': 'memberIds must be an array of user IDs'
    })
  }),

  // Stock adjustment schema
  adjustStock: Joi.object({
    productId: Joi.number().integer().required(),
    quantity: Joi.number().integer().required().messages({
      'number.base': 'Quantity must be a number'
    }),
    reason: Joi.string().max(255).required(),
    version: Joi.number().integer() // For optimistic locking
  }),

  // Order schema
  createOrder: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().precision(2).required()
      })
    ).min(1).required().messages({
      'array.min': 'Order must have at least one item'
    }),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().length(2).required(),
      zip: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required()
    }).required()
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().max(255),
    sort: Joi.string().max(50),
    order: Joi.string().valid('asc', 'desc').default('asc')
  })
};

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - 'body', 'query', 'params'
 * @param {boolean} sanitize - Whether to sanitize content fields
 * @returns {function} Express middleware
 */
const validateRequest = (schema, source = 'body', sanitize = false) => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types where possible
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        message: 'Validation error',
        errors: messages
      });
    }

    // Sanitize content fields if requested
    if (sanitize && req.body && typeof req.body === 'object') {
      Object.keys(req.body).forEach(key => {
        if (key.includes('content') || key.includes('description') || key.includes('message')) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = sanitizeContent(req.body[key]);
          }
        }
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

module.exports = {
  schemas,
  validateRequest,
  sanitizeContent
};
