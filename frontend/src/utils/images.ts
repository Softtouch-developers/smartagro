import { API_BASE_URL } from './constants';

export const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return '/placeholder-product.jpg';

    const trimmedPath = path.trim();

    // Handle GCS URLs specifically (fix double prefixing, missing protocol, or extra prefixes)
    // This regex matches "storage.googleapis.com" and everything after it
    if (trimmedPath.includes('storage.googleapis.com')) {
        const match = trimmedPath.match(/(storage\.googleapis\.com.*)/);
        if (match) {
            return `https://${match[1]}`;
        }
    }

    // Fix potential double protocol typos (e.g. https//)
    if (trimmedPath.includes('https//')) {
        return trimmedPath.replace('https//', 'https://');
    }
    if (trimmedPath.includes('http//')) {
        return trimmedPath.replace('http//', 'http://');
    }

    // Standard Absolute URLs
    if (trimmedPath.startsWith('http') || trimmedPath.startsWith('//')) {
        return trimmedPath;
    }

    // Local uploads
    // Strip /api/v1 from base URL if present
    const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    // Remove leading slash from path
    let cleanPath = trimmedPath.startsWith('/') ? trimmedPath.slice(1) : trimmedPath;

    // Ensure path starts with uploads/ if it's not an absolute URL
    if (!cleanPath.startsWith('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    }

    return `${baseUrl}/${cleanPath}`;
};
