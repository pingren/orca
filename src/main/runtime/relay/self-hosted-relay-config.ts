import { cleanCloudServiceOrigin } from '../../../shared/cloud-service-url'
import type { RelayAuthContext } from './relay-auth-coordinator'

export type SelfHostedRelayConfig = {
  relayDirectorUrl: string
  relayTokenEndpoint: string
  accessKey: string
}

export function getSelfHostedRelayConfig(
  env: NodeJS.ProcessEnv,
  packaged: boolean
): SelfHostedRelayConfig | undefined {
  const url = env.ORCA_RELAY_SELF_HOSTED_URL?.trim()
  const accessKey = env.ORCA_RELAY_SELF_HOSTED_KEY?.trim()
  if (url === undefined && accessKey === undefined) {
    return undefined
  }
  const relayDirectorUrl = cleanCloudServiceOrigin(url, !packaged)
  if (
    !relayDirectorUrl ||
    !url ||
    new URL(url).username ||
    new URL(url).password ||
    !accessKey ||
    !/^[A-Za-z0-9_-]{32,256}$/.test(accessKey)
  ) {
    throw new Error('Self-hosted Relay requires an HTTPS origin and a 32–256 character access key.')
  }
  return {
    relayDirectorUrl,
    relayTokenEndpoint: `${relayDirectorUrl}/v1/host-token`,
    accessKey
  }
}

export function selfHostedRelayAuthContext(config: SelfHostedRelayConfig): RelayAuthContext {
  return {
    identity: { userId: 'self-hosted', profileId: config.relayDirectorUrl, organizationId: '' },
    accessToken: config.accessKey,
    relayEntitled: true
  }
}
