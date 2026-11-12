/**
 * Host half of the turn-notify bundle.
 *
 * All notification logic lives in the Client half: this bundle observes Session
 * status in the browser, so it needs no Host service, route, or storage. The
 * Host half exists only because a bundle entry must export `apply`; it stays
 * empty on purpose.
 */

/** No Host-side work: the Client half owns the whole feature. */
export function apply() {}
