import { Intention, MultipleMessagesResponse, SimplifiedTwilioWebhookPayload } from "src/lib";

export interface IntentionStrategyInterface {
    readonly intent: Intention;
    execute(aiResponse: MultipleMessagesResponse, simplifiedPayload: SimplifiedTwilioWebhookPayload): Promise<StrategyResult>   
}

export interface StrategyResult {
  reply: string;
}
