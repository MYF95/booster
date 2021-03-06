import { ExecutionResult } from 'graphql'
import {
  GraphQLRequestEnvelope,
  Logger,
  MessageTypes,
  GraphQLClientMessage,
  GraphQLInitError,
  GraphQLServerMessage,
  GraphQLInitAck,
  GraphQLData,
  GraphQLStart,
  GraphQLComplete,
  GraphQLError,
} from '@boostercloud/framework-types'

export interface GraphQLWebsocketHandlerCallbacks {
  onStartOperation: (
    envelope: GraphQLRequestEnvelope
  ) => Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>
  onStopOperation: (envelope: GraphQLRequestEnvelope) => Promise<ExecutionResult>
  onTerminateOperations: (envelope: GraphQLRequestEnvelope) => Promise<ExecutionResult>
}

export class GraphQLWebsocketHandler {
  public constructor(
    private readonly logger: Logger,
    private readonly sendToConnection: (connectionID: string, data: GraphQLServerMessage) => Promise<void>,
    private readonly callbacks: GraphQLWebsocketHandlerCallbacks
  ) {}

  public async handle(envelope: GraphQLRequestEnvelope): Promise<void> {
    if (!envelope.connectionID) {
      // Impossible case, but just to be sure. The only thing we can do here is to log, as we don't have the connection
      // to send the message to
      this.logger.error('Missing websocket connectionID')
      return
    }

    try {
      this.logger.debug('Handling websocket message')
      if (!envelope.value) {
        throw new Error('Received an empty GraphQL body')
      }
      const clientMessage = envelope.value as GraphQLClientMessage
      this.logger.debug('Received client message: ', clientMessage)
      switch (clientMessage.type) {
        case MessageTypes.GQL_CONNECTION_INIT:
          return await this.handleInit(envelope.connectionID)
        case MessageTypes.GQL_START:
          return await this.handleStart(envelope.connectionID, envelope, clientMessage)
        case MessageTypes.GQL_STOP:
          console.log(this.callbacks.onStopOperation) // TODO
          break
        case MessageTypes.GQL_CONNECTION_TERMINATE:
          console.log(this.callbacks.onTerminateOperations) // TODO
          break
        default:
          // This branch should be impossible, but just in case
          throw new Error(`Unknown message type. Message=${clientMessage}`)
      }
    } catch (e) {
      this.logger.error(e)
      await this.sendToConnection(envelope.connectionID, new GraphQLInitError(e.message))
    }
  }

  private async handleInit(connectionID: string): Promise<void> {
    this.logger.debug('Sending ACK')
    await this.sendToConnection(connectionID, new GraphQLInitAck())
  }

  private async handleStart(
    connectionID: string,
    envelope: GraphQLRequestEnvelope,
    message: GraphQLStart
  ): Promise<void> {
    if (!message.id) {
      throw new Error(`Missing "id" in ${message.type} message`)
    }
    if (!message.payload || !message.payload.query) {
      await this.sendToConnection(
        connectionID,
        new GraphQLError(message.id, {
          errors: [new Error('Message payload is invalid it must contain at least the "query" property')],
        })
      )
      return
    }
    const unwrappedEnvelope: GraphQLRequestEnvelope = {
      ...envelope,
      value: {
        ...message.payload,
        id: message.id,
      },
    }

    this.logger.debug('Executing operation. Envelope: ', unwrappedEnvelope)
    const result = await this.callbacks.onStartOperation(unwrappedEnvelope)

    if ('next' in result) {
      this.logger.debug('Subscription finished.')
      return // It was a subscription. We don't need to send any data
    }

    this.logger.debug('Operation finished. Sending DATA:', result)
    // It was a query or mutation. We send data and complete the operation
    await this.sendToConnection(connectionID, new GraphQLData(message.id, result))
    await this.sendToConnection(connectionID, new GraphQLComplete(message.id))
  }
}
