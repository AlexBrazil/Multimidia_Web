const DEFAULT_STATIC_PREFIX = '/static/';
const ABSOLUTE_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const DATA_OR_BLOB_PATTERN = /^(?:data|blob):/i;

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

const STATIC_PREFIX = (() => {
  if (typeof window !== 'undefined' && window.APP_STATIC_PREFIX) {
    return ensureTrailingSlash(String(window.APP_STATIC_PREFIX));
  }
  return DEFAULT_STATIC_PREFIX;
})();

function isAbsolutePath(path) {
  if (!path) return false;
  return ABSOLUTE_PATTERN.test(path) || DATA_OR_BLOB_PATTERN.test(path) || path.startsWith('/');
}

function buildStaticUrl(relativePath) {
  if (!relativePath) return '';
  const trimmed = relativePath.replace(/^\/+/, '');
  return `${STATIC_PREFIX}${trimmed}`;
}

function normalizeAssetPath(input, folder) {
  if (!input) return '';
  if (isAbsolutePath(input)) return input;
  if (input.startsWith('assets/')) {
    return buildStaticUrl(input);
  }
  const cleanInput = input.replace(/^\/+/, '');
  const prefix = folder ? `assets/${folder}/` : 'assets/';
  return buildStaticUrl(`${prefix}${cleanInput}`);
}

export function resolveAudioAsset(filename) {
  return normalizeAssetPath(filename, 'audio');
}

export function resolveImageAsset(filename) {
  return normalizeAssetPath(filename, 'images');
}

export function resolveVideoAsset(filename) {
  return normalizeAssetPath(filename, 'videos');
}

export function getStaticPrefix() {
  return STATIC_PREFIX;
}
