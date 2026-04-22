const fs = require('fs');
const path = require('path');

const TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'templates.json');

function readTemplatesFile() {
  const contents = fs.readFileSync(TEMPLATES_FILE, 'utf8');
  try {
    return JSON.parse(contents || '[]');
  } catch (err) {
    // If file is corrupted or empty, return empty array to avoid crash
    return [];
  }
}

function getAllTemplates() {
  const templates = readTemplatesFile();
  return templates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getTemplateById(id) {
  const templates = readTemplatesFile();
  return templates.find(t => t.id === id);
}

function getTemplatesByOwner(owner) {
  if (!owner) return [];
  const templates = readTemplatesFile();
  return templates
    .filter(t => t.owner && t.owner.toLowerCase() === owner.toLowerCase())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function saveTemplate(template) {
  const templates = readTemplatesFile();

  templates.push(template);

  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');
  return template;
}

function updateTemplateName(id, newName) {
  const templates = readTemplatesFile();
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return false;
  tpl.name = newName;
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');
  return true;
}

function updateTemplate(id, updates) {
  const templates = readTemplatesFile();
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return false;

  // Merge updates into existing template object. Expect updates to contain
  // { name?, items?, owner? }
  const tpl = templates[idx];
  if (typeof updates.name === 'string') tpl.name = updates.name;
  if (typeof updates.owner === 'string') tpl.owner = updates.owner;
  if (Array.isArray(updates.items)) tpl.items = updates.items;
  tpl.updatedAt = new Date().toISOString();

  templates[idx] = tpl;
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');
  return true;
}

function deleteTemplate(id) {
  let templates = readTemplatesFile();
  const before = templates.length;
  templates = templates.filter(t => t.id !== id);
  if (templates.length === before) return false; // nothing removed
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');
  return true;
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  getTemplatesByOwner,
  saveTemplate,
  updateTemplateName,
  deleteTemplate
  ,updateTemplate
};
