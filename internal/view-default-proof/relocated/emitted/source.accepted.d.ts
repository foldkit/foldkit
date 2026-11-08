import { Schema } from 'effect';
import { Block, Message, Program } from 'foldkit';
import type { Html } from 'foldkit/html';
type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => (Value extends Right ? 1 : 2) ? true : false;
type Expect<Value extends true> = Value;
declare const Model: Schema.Struct<{
    readonly value: Schema.String;
}>;
type Model = typeof Model.Type;
declare const LocalMessage: Message.MessageUnion<{
    readonly ClickedValue: {};
}>;
declare const DefaultElementKey: unique symbol;
declare const DefaultElementBlock: Block.UnifiedBlockFields<"ViewDefaultElement", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, {
    readonly key: typeof DefaultElementKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
} & Readonly<{
    key: typeof DefaultElementKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DefaultElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
declare const DefaultElementComposition: Block.ContractComposition<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, Pick<{
    readonly key: typeof DefaultElementKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
} & Readonly<{
    key: typeof DefaultElementKey;
}>, "InitArgs" | "key">>;
export type DefaultElementBuilder = Block.ViewBuilderFor<typeof DefaultElementComposition>;
export declare const defaultElementInputsView: Block.AuthoredViewPlan<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, void>;
export declare const defaultElementLayer: import("effect/Layer").Layer<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DefaultElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>> | Block.ExactReadable<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DefaultElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>> | Block.SelectedImplementationFacts<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DefaultElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>, {
    readonly isMessageFree: false;
    readonly initArgs: [];
    readonly init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    readonly updateContext: [];
    readonly update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    readonly updates: {
        readonly ClickedValue: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>>;
    };
    readonly operations: {};
    readonly view: Block.ViewContract<void, "Element">;
    readonly subscriptions: {};
    readonly mountRequirements: never;
    readonly effectsLayerRequirements: never;
    readonly effectsLayerError: never;
    readonly hostRequirements: never;
    readonly programRequirements: never;
    readonly runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>;
    readonly decodingServices: never;
    readonly encodingServices: never;
}, never>, never, never>;
export declare const defaultElementProgram: Program.ConstructionPending<undefined, void, never, never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>, Block.InternalExecution<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>, never, "Element"> & Program.Runnable<undefined, void, Block.InternalExecution<Block.Owner<Block.NominalId<"ViewDefaultElement", typeof DefaultElementKey>, true>>, "Element">;
export declare const Inputs: Schema.Struct<{
    readonly label: Schema.String;
}>;
type Inputs = typeof Inputs.Type;
declare const InputsElementKey: unique symbol;
declare const InputsElementBlock: Block.UnifiedBlockFields<"ViewDefaultInputsElement", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, {
    readonly key: typeof InputsElementKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: {
        readonly Inputs: Schema.Struct<{
            readonly label: Schema.String;
        }>;
    };
} & Readonly<{
    key: typeof InputsElementKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof InputsElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<{
        readonly label: string;
    }, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
export declare const inputsElementLayer: import("effect/Layer").Layer<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof InputsElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<{
        readonly label: string;
    }, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>> | Block.ExactReadable<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof InputsElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<{
        readonly label: string;
    }, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>> | Block.SelectedImplementationFacts<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof InputsElementKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<{
        readonly label: string;
    }, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>, {
    readonly isMessageFree: false;
    readonly initArgs: [];
    readonly init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    readonly updateContext: [];
    readonly update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    readonly updates: {
        readonly ClickedValue: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>>;
    };
    readonly operations: {};
    readonly view: Block.ViewContract<{
        readonly label: string;
    }, "Element">;
    readonly subscriptions: {};
    readonly mountRequirements: never;
    readonly effectsLayerRequirements: never;
    readonly effectsLayerError: never;
    readonly hostRequirements: never;
    readonly programRequirements: never;
    readonly runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultInputsElement", typeof InputsElementKey>, true>>;
    readonly decodingServices: never;
    readonly encodingServices: never;
}, never>, never, never>;
declare const DocumentKey: unique symbol;
declare const DocumentBlock: Block.UnifiedBlockFields<"ViewDefaultDocument", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, {
    readonly key: typeof DocumentKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: {
        readonly kind: "Document";
    };
} & Readonly<{
    key: typeof DocumentKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DocumentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Document">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
export declare const documentLayer: import("effect/Layer").Layer<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DocumentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Document">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>> | Block.ExactReadable<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DocumentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Document">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>> | Block.SelectedImplementationFacts<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof DocumentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Document">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>, {
    readonly isMessageFree: false;
    readonly initArgs: [];
    readonly init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    readonly updateContext: [];
    readonly update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    readonly updates: {
        readonly ClickedValue: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>>;
    };
    readonly operations: {};
    readonly view: Block.ViewContract<void, "Document">;
    readonly subscriptions: {};
    readonly mountRequirements: never;
    readonly effectsLayerRequirements: never;
    readonly effectsLayerError: never;
    readonly hostRequirements: never;
    readonly programRequirements: never;
    readonly runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>;
    readonly decodingServices: never;
    readonly encodingServices: never;
}, never>, never, never>;
export declare const documentProgram: Program.ConstructionPending<undefined, void, never, never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>, Block.InternalExecution<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>, never, "Application"> & Program.Runnable<undefined, void, Block.InternalExecution<Block.Owner<Block.NominalId<"ViewDefaultDocument", typeof DocumentKey>, true>>, "Application">;
declare const ViewlessKey: unique symbol;
declare const ViewlessBlock: Block.UnifiedBlockFields<"ViewDefaultViewless", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, {
    readonly key: typeof ViewlessKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: false;
} & Readonly<{
    key: typeof ViewlessKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof ViewlessKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: undefined;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
export declare const viewlessLayer: import("effect/Layer").Layer<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof ViewlessKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: undefined;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>> | Block.ExactReadable<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof ViewlessKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: undefined;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>> | Block.SelectedImplementationFacts<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof ViewlessKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: undefined;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, {
    readonly isMessageFree: false;
    readonly initArgs: [];
    readonly init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    readonly updateContext: [];
    readonly update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    readonly updates: {
        readonly ClickedValue: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    };
    readonly operations: {};
    readonly view: undefined;
    readonly subscriptions: {};
    readonly mountRequirements: never;
    readonly effectsLayerRequirements: never;
    readonly effectsLayerError: never;
    readonly hostRequirements: never;
    readonly programRequirements: never;
    readonly runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>;
    readonly decodingServices: never;
    readonly encodingServices: never;
}, never>, never, never>;
declare const WholeConfigurationUnionKey: unique symbol;
export declare const WholeConfigurationUnionBlock: Block.UnifiedBlockFields<"ViewDefaultWholeUnion", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, ({
    readonly key: typeof WholeConfigurationUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: false;
} | {
    readonly key: typeof WholeConfigurationUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
}) & Readonly<{
    key: typeof WholeConfigurationUnionKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultWholeUnion", typeof WholeConfigurationUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof WholeConfigurationUnionKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultWholeUnion", typeof WholeConfigurationUnionKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultWholeUnion", typeof WholeConfigurationUnionKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element"> | undefined;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultWholeUnion", typeof WholeConfigurationUnionKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
export declare const WholeConfigurationUnionComposition: Block.ContractComposition<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultWholeUnion", typeof WholeConfigurationUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, Pick<{
    readonly key: typeof WholeConfigurationUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: false;
} & Readonly<{
    key: typeof WholeConfigurationUnionKey;
}>, "InitArgs" | "key" | "view"> | Pick<{
    readonly key: typeof WholeConfigurationUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
} & Readonly<{
    key: typeof WholeConfigurationUnionKey;
}>, "InitArgs" | "key">>;
declare const PropertyInputsUnionKey: unique symbol;
export declare const PropertyInputsUnionBlock: Block.UnifiedBlockFields<"ViewDefaultPropertyInputsUnion", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, {
    readonly key: typeof PropertyInputsUnionKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: {
        readonly Inputs: typeof Inputs;
    } | {};
} & Readonly<{
    key: typeof PropertyInputsUnionKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultPropertyInputsUnion", typeof PropertyInputsUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof PropertyInputsUnionKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultPropertyInputsUnion", typeof PropertyInputsUnionKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultPropertyInputsUnion", typeof PropertyInputsUnionKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<{
        readonly label: string;
    }, "Element"> | Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultPropertyInputsUnion", typeof PropertyInputsUnionKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
export declare const PropertyInputsUnionComposition: Block.ContractComposition<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultPropertyInputsUnion", typeof PropertyInputsUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, Pick<{
    readonly key: typeof PropertyInputsUnionKey;
    readonly Model: Schema.Struct<{
        readonly value: Schema.String;
    }>;
    readonly Message: Message.MessageUnion<{
        readonly ClickedValue: {};
    }>;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: {
        readonly Inputs: typeof Inputs;
    } | {};
} & Readonly<{
    key: typeof PropertyInputsUnionKey;
}>, "InitArgs" | "key" | "view">>;
export declare const propertyInputsUnionAuthoredView: Block.AuthoredViewPlan<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultPropertyInputsUnion", typeof PropertyInputsUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, void | {
    readonly label: string;
}>;
declare const WholeInputsUnionKey: unique symbol;
export declare const WholeInputsUnionBlock: Block.UnifiedBlockFields<"ViewDefaultWholeInputsUnion", Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, undefined, ({
    readonly key: typeof WholeInputsUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: {
        readonly Inputs: typeof Inputs;
    };
} | {
    readonly key: typeof WholeInputsUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
}) & Readonly<{
    key: typeof WholeInputsUnionKey;
}>, {
    readonly _tag: "ClickedValue";
}, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultWholeInputsUnion", typeof WholeInputsUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof WholeInputsUnionKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultWholeInputsUnion", typeof WholeInputsUnionKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultWholeInputsUnion", typeof WholeInputsUnionKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<{
        readonly label: string;
    }, "Element"> | Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultWholeInputsUnion", typeof WholeInputsUnionKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, never>;
export declare const WholeInputsUnionComposition: Block.ContractComposition<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultWholeInputsUnion", typeof WholeInputsUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, Pick<{
    readonly key: typeof WholeInputsUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
    readonly view: {
        readonly Inputs: typeof Inputs;
    };
} & Readonly<{
    key: typeof WholeInputsUnionKey;
}>, "InitArgs" | "key" | "view"> | Pick<{
    readonly key: typeof WholeInputsUnionKey;
    readonly Model: typeof Model;
    readonly Message: typeof LocalMessage;
    readonly InitArgs: Schema.Tuple<readonly []>;
} & Readonly<{
    key: typeof WholeInputsUnionKey;
}>, "InitArgs" | "key">>;
export declare const wholeInputsUnionAuthoredView: Block.AuthoredViewPlan<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultWholeInputsUnion", typeof WholeInputsUnionKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, void | {
    readonly label: string;
}>;
declare const ParentKey: unique symbol;
export declare const parentLayer: import("effect/Layer").Layer<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>, Schema.Struct<{
    readonly child: Schema.Struct<{
        readonly value: Schema.String;
    }>;
}>, Schema.Never, undefined, Readonly<{
    identity: typeof ParentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>> | Block.ExactReadable<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>, Schema.Struct<{
    readonly child: Schema.Struct<{
        readonly value: Schema.String;
    }>;
}>, Schema.Never, undefined, Readonly<{
    identity: typeof ParentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>> | Block.SelectedImplementationFacts<Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>, Schema.Struct<{
    readonly child: Schema.Struct<{
        readonly value: Schema.String;
    }>;
}>, Schema.Never, undefined, Readonly<{
    identity: typeof ParentKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: Block.ViewContract<void, "Element">;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>, Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>, {
    readonly isMessageFree: false;
    readonly initArgs: [];
    readonly init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    readonly updateContext: [];
    readonly update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>>>;
    readonly updates: {};
    readonly operations: {};
    readonly view: Block.ViewContract<void, "Element">;
    readonly subscriptions: {};
    readonly mountRequirements: never;
    readonly effectsLayerRequirements: never;
    readonly effectsLayerError: never;
    readonly hostRequirements: never;
    readonly programRequirements: never;
    readonly runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultParent", typeof ParentKey>, true>> | Block.Scoped<"child", Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    readonly decodingServices: never;
    readonly encodingServices: never;
}, never>, never, Block.ContractGraph<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, Readonly<{
    identity: typeof ViewlessKey;
    isMessageFree: false;
    initArgs: readonly [];
    init: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updateContext: readonly [];
    update: Block.ResultContract<never, Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>>;
    updates: Readonly<Record<never, never>>;
    operations: {};
    view: undefined;
    subscriptions: Readonly<Record<never, never>>;
    mountRequirements: never;
    effectsLayerRequirements: never;
    effectsLayerError: never;
    hostRequirements: never;
    programRequirements: never;
    runtimeServices: Block.RuntimeCapability<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>>;
    decodingServices: never;
    encodingServices: never;
}>>>;
export declare const makeGenericAlternateView: <Item>() => Block.AuthoredViewPlan<Block.StaticSource<Block.Owner<Block.NominalId<"ViewDefaultViewless", typeof ViewlessKey>, true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, undefined, readonly [], readonly []>, {
    items: ReadonlyArray<Item>;
    itemToView: (item: Item) => Html;
}>;
declare const prepareLegacy: () => Block.AssemblyDraft<Block.CompletedBlockWithoutViewOrOutMessage<Block.Owner<"ViewDefaultLegacy", true>, Schema.Struct<{
    readonly value: Schema.String;
}>, Message.MessageUnion<{
    readonly ClickedValue: {};
}>, readonly [], readonly [], Readonly<{
    readonly init: NoInfer<() => import("foldkit/update").Return<{
        value: string;
    }, {
        readonly _tag: "ClickedValue";
    }, never>>;
    readonly update: {
        (message: {
            readonly _tag: "ClickedValue";
        }): (model: {
            readonly value: string;
        }) => import("foldkit/update").Return<{
            readonly value: string;
        }, {
            readonly _tag: "ClickedValue";
        }, never>;
        (model: {
            readonly value: string;
        }, message: {
            readonly _tag: "ClickedValue";
        }): import("foldkit/update").Return<{
            readonly value: string;
        }, {
            readonly _tag: "ClickedValue";
        }, never>;
    } & Block.OperationOutputs<readonly [tag: "ClickedValue", outMessage: never, requirements: never, registration: never]>;
    readonly EffectsLayer: import("effect/Layer").Layer<never, never, never>;
}>>>;
export declare const LegacyViewlessBlock: Block.FromAssemblyWithoutViewOrOutMessage<typeof Model, typeof prepareLegacy>;
type DefaultView = Block.FactsOf<typeof DefaultElementBlock>['view'];
type InputsView = Block.FactsOf<typeof InputsElementBlock>['view'];
type DocumentView = Block.FactsOf<typeof DocumentBlock>['view'];
type ViewlessView = Block.FactsOf<typeof ViewlessBlock>['view'];
type WholeConfigurationUnionView = Block.FactsOf<typeof WholeConfigurationUnionBlock>['view'];
type PropertyInputsUnionView = Block.FactsOf<typeof PropertyInputsUnionBlock>['view'];
type WholeInputsUnionView = Block.FactsOf<typeof WholeInputsUnionBlock>['view'];
export type Assertions = [
    Expect<Equal<DefaultView['kind'], 'Element'>>,
    Expect<Equal<DefaultView['inputs'], void>>,
    Expect<Equal<InputsView['kind'], 'Element'>>,
    Expect<Equal<InputsView['inputs'], typeof Inputs.Type>>,
    Expect<Equal<DocumentView['kind'], 'Document'>>,
    Expect<Equal<ViewlessView, undefined>>,
    Expect<Equal<WholeConfigurationUnionView, undefined | DefaultView>>,
    Expect<Equal<PropertyInputsUnionView['inputs'], Inputs | void>>,
    Expect<Equal<WholeInputsUnionView['inputs'], Inputs | void>>
];
export {};
