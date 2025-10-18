import { Intention, MultipleMessagesResponse } from "src/lib";

export interface IntentionStrategyInterface {
    readonly intent: Intention;
    execute(aiResponse: MultipleMessagesResponse): Promise<StrategyResult>   
}

export interface StrategyResult {
  reply: string;
}
