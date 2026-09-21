import {
  isPairingDirectEndpoint,
  MAX_PAIRING_DIRECT_ENDPOINTS,
  type PairingGetDirectEndpointsResult
} from '../../shared/pairing-direct-endpoints'
import { isPairingWildcardHostname } from '../../shared/network/pairing-url'
import { isVirtualBridgeInterface } from '../../shared/pairing-address-auto-selection'
import { isTailnetIPv4Address } from '../../shared/tailnet-address'
import { getPairingNetworkInterfaces } from './pairing-network-interfaces'
import { resolveAdvertisedPairingEndpoint } from './pairing-endpoint'

export async function resolvePairingDirectEndpoints(
  boundEndpoint: string | null
): Promise<PairingGetDirectEndpointsResult> {
  const result: PairingGetDirectEndpointsResult = { v: 1, endpoints: [] }
  if (!boundEndpoint) {
    return result
  }
  const bound = new URL(boundEndpoint)
  const wildcard = isPairingWildcardHostname(bound.hostname)
  // Discovery must never widen a loopback listener or invent another listening port.
  if (!wildcard && !isPairingDirectEndpoint(boundEndpoint)) {
    return result
  }
  const seen = new Set<string>()
  for (const iface of await getPairingNetworkInterfaces()) {
    if (isVirtualBridgeInterface(iface.name, iface.hasDefaultRoute)) {
      continue
    }
    const resolved = resolveAdvertisedPairingEndpoint(boundEndpoint, iface.address)
    if (
      !resolved.ok ||
      !isPairingDirectEndpoint(resolved.endpoint) ||
      seen.has(resolved.endpoint)
    ) {
      continue
    }
    const hostname = new URL(resolved.endpoint).hostname
    if (
      (!wildcard && hostname !== bound.hostname) ||
      (bound.hostname === '0.0.0.0' && hostname.includes(':'))
    ) {
      continue
    }
    seen.add(resolved.endpoint)
    result.endpoints.push({
      kind: isTailnetIPv4Address(iface.address) ? 'tailscale' : 'lan',
      url: resolved.endpoint
    })
    if (result.endpoints.length === MAX_PAIRING_DIRECT_ENDPOINTS) {
      break
    }
  }
  return result
}
