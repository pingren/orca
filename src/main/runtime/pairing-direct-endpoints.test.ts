import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePairingDirectEndpoints } from './pairing-direct-endpoints'
import { getPairingNetworkInterfaces } from './pairing-network-interfaces'

vi.mock('./pairing-network-interfaces', () => ({ getPairingNetworkInterfaces: vi.fn() }))

describe('advertising reachable direct listeners', () => {
  beforeEach(() => vi.resetAllMocks())

  it('filters host-local adapters and non-unicast addresses while retaining an external Hyper-V switch', async () => {
    vi.mocked(getPairingNetworkInterfaces).mockResolvedValue([
      { name: 'docker0', address: '172.17.0.1' },
      { name: 'vEthernet (WSL)', address: '172.25.0.1', hasDefaultRoute: true },
      { name: 'vEthernet (External)', address: '192.168.1.20', hasDefaultRoute: true },
      { name: 'vEthernet (Unknown)', address: '192.168.2.20' },
      { name: 'tun0', address: '198.18.0.1' },
      { name: 'en0', address: '169.254.1.2' },
      { name: 'en0', address: '224.0.0.1' },
      { name: 'en0', address: '255.255.255.255' },
      { name: 'en0', address: '0.1.2.3' },
      { name: 'lo0', address: '127.0.0.2' },
      { name: 'tailscale0', address: '100.64.0.2' }
    ])
    await expect(resolvePairingDirectEndpoints('ws://0.0.0.0:6769')).resolves.toEqual({
      v: 1,
      endpoints: [
        { kind: 'lan', url: 'ws://192.168.1.20:6769' },
        { kind: 'tailscale', url: 'ws://100.64.0.2:6769' }
      ]
    })
  })

  it('only advertises addresses served by a specific interface or IPv4 listener', async () => {
    vi.mocked(getPairingNetworkInterfaces).mockResolvedValue([
      { name: 'en0', address: '10.20.30.40' },
      { name: 'en1', address: '192.168.1.20' },
      { name: 'en0', address: 'fd00::1234' }
    ])
    await expect(resolvePairingDirectEndpoints('ws://10.20.30.40:6768')).resolves.toEqual({
      v: 1,
      endpoints: [{ kind: 'lan', url: 'ws://10.20.30.40:6768' }]
    })
    const ipv4 = await resolvePairingDirectEndpoints('ws://0.0.0.0:6768')
    expect(ipv4.endpoints.map(({ url }) => url)).toEqual([
      'ws://10.20.30.40:6768',
      'ws://192.168.1.20:6768'
    ])
  })

  it('formats usable IPv6 addresses without advertising link-local, mapped or multicast addresses', async () => {
    vi.mocked(getPairingNetworkInterfaces).mockResolvedValue([
      { name: 'en0', address: 'fd00::1234' },
      { name: 'en0', address: 'fe80::1234' },
      { name: 'en0', address: 'ff02::1' },
      { name: 'en0', address: '::ffff:169.254.1.2' },
      { name: 'lo0', address: '::1' }
    ])
    await expect(resolvePairingDirectEndpoints('ws://[::]:6768')).resolves.toEqual({
      v: 1,
      endpoints: [{ kind: 'lan', url: 'ws://[fd00::1234]:6768' }]
    })
  })

  it('bounds parallel phone probes and deduplicates interface aliases', async () => {
    vi.mocked(getPairingNetworkInterfaces).mockResolvedValue([
      { name: 'en0', address: '10.0.0.1' },
      ...Array.from({ length: 12 }, (_, index) => ({ name: 'en0', address: `10.0.0.${index + 1}` }))
    ])
    const result = await resolvePairingDirectEndpoints('ws://0.0.0.0:6768')
    expect(result.endpoints).toHaveLength(8)
    expect(new Set(result.endpoints.map(({ url }) => url)).size).toBe(8)
  })

  it('does not enumerate interfaces when there is no listener', async () => {
    await expect(resolvePairingDirectEndpoints(null)).resolves.toEqual({ v: 1, endpoints: [] })
    expect(getPairingNetworkInterfaces).not.toHaveBeenCalled()
  })
})
