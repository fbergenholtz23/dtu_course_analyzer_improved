export function sanitizeCookie(raw: string): string {
    const trimmed = raw.trim()
    if (trimmed.includes(' ')) {
        throw new Error('Invalid session cookie: must not contain spaces')
    }
    if (trimmed.length < 10 || trimmed.length > 200) {
        throw new Error('Invalid session cookie: unexpected length')
    }
    return trimmed
}