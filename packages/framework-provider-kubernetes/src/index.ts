/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProviderInfrastructure, ProviderLibrary } from '@boostercloud/framework-types'

export const Provider: ProviderLibrary = {
  // ProviderEventsLibrary
  events: {
    rawToEnvelopes: undefined as any,
    store: undefined as any,
    forEntitySince: undefined as any,
    latestEntitySnapshot: undefined as any,
  },
  // ProviderReadModelsLibrary
  readModels: {
    fetch: undefined as any,
    search: undefined as any,
    subscribe: undefined as any,
    rawToEnvelopes: undefined as any,
    fetchSubscriptions: undefined as any,
    notifySubscription: undefined as any,
    store: undefined as any,
  },
  // ProviderGraphQLLibrary
  graphQL: {
    authorizeRequest: undefined as any,
    rawToEnvelope: undefined as any,
    handleResult: undefined as any,
  },
  // ProviderAuthLibrary
  auth: {
    rawToEnvelope: undefined as any,
  },
  // ProviderAPIHandling
  api: {
    requestSucceeded: undefined as any,
    requestFailed: undefined as any,
  },
  // ProviderInfrastructureGetter
  infrastructure: () =>
    require(require('../package.json').name + '-infrastructure').Infrastructure as ProviderInfrastructure,
}
