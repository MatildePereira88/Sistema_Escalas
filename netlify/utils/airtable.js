// netlify/utils/airtable.js
const Airtable = require('airtable');

// As chaves são lidas das variáveis de ambiente que configuramos no Netlify
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);

module.exports = { base };