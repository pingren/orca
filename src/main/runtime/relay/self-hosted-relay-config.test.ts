import { describe, expect, it } from 'vitest'
import { getSelfHostedRelayConfig, selfHostedRelayAuthContext } from './self-hosted-relay-config'

const env = {
  ORCA_RELAY_SELF_HOSTED_URL: 'https://relay.example.test',
  ORCA_RELAY_SELF_HOSTED_KEY: 'owner-access-key-with-at-least-32-characters'
}

describe('self-hosted desktop Relay configuration', () => {
  it('leaves ordinary builds unchanged and scopes owner identity to the chosen server', () => {
    expect(getSelfHostedRelayConfig({}, true)).toBeUndefined()
    const config = getSelfHostedRelayConfig(env, true)!
    expect(config.relayTokenEndpoint).toBe('https://relay.example.test/v1/host-token')
    expect(selfHostedRelayAuthContext(config)).toEqual({
      identity: {
        userId: 'self-hosted',
        profileId: env.ORCA_RELAY_SELF_HOSTED_URL,
        organizationId: ''
      },
      accessToken: env.ORCA_RELAY_SELF_HOSTED_KEY,
      relayEntitled: true
    })
  })

  it('rejects incomplete or unsafe configuration without falling back to cloud credentials', () => {
    for (const url of [
      '',
      'http://relay.example.test',
      'https://user:password@relay.example.test',
      'https://relay.example.test/path',
      'https://relay.example.test?key=value',
      'not-a-url'
    ]) {
      expect(() =>
        getSelfHostedRelayConfig({ ...env, ORCA_RELAY_SELF_HOSTED_URL: url }, true)
      ).toThrow()
    }
    expect(() =>
      getSelfHostedRelayConfig({ ORCA_RELAY_SELF_HOSTED_URL: env.ORCA_RELAY_SELF_HOSTED_URL }, true)
    ).toThrow()
    expect(() =>
      getSelfHostedRelayConfig({ ...env, ORCA_RELAY_SELF_HOSTED_KEY: 'short' }, true)
    ).toThrow()
    const local = { ...env, ORCA_RELAY_SELF_HOSTED_URL: 'http://127.0.0.1:8080' }
    expect(() => getSelfHostedRelayConfig(local, true)).toThrow()
    expect(getSelfHostedRelayConfig(local, false)?.relayDirectorUrl).toBe(
      local.ORCA_RELAY_SELF_HOSTED_URL
    )
  })
})
