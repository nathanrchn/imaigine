module imaigine::model {
    use sui::package;
    use std::string::String;
    use kiosk::royalty_rule::Self;
    use sui::transfer_policy::{Self, TransferPolicy, TransferRequest};
    
    public struct Model has key, store {
        id: UID,
        config: Config,
        image_url: String,
        is_published: bool,
    }

    public struct Config has key, store {
        id: UID,
        weights_link: String,
        trigger_word: String,
    }

    public struct MODEL has drop {}

    #[allow(lint(share_owned))]
    fun init(otw: MODEL, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let (model_policy, model_policy_cap) = transfer_policy::new<Model>(&publisher, ctx);

        transfer::public_share_object(model_policy);
        transfer::public_transfer(model_policy_cap, ctx.sender());

        let (mut config_policy, config_policy_cap) = transfer_policy::new<Config>(&publisher, ctx);
        royalty_rule::add<Config>(&mut config_policy, &config_policy_cap, 5, 0);
        transfer::public_share_object(config_policy);
        transfer::public_transfer(config_policy_cap, ctx.sender());

        transfer::public_transfer(publisher, ctx.sender());
    }

    public fun confirm_request(policy: &TransferPolicy<Model>, request: TransferRequest<Model>) {
        transfer_policy::confirm_request<Model>(policy, request);
    }

    entry public fun create(weights_link: String, trigger_word: String, image_url: String, ctx: &mut TxContext) {
        let model = Model {
            id: object::new(ctx),
            config: Config {
                id: object::new(ctx),
                weights_link,
                trigger_word,
            },
            image_url,
            is_published: false,
        };
        
        transfer::public_transfer(model, ctx.sender());
    }

    entry public fun publish_model(self: &mut Model) {
        self.is_published = true;
    }

    public fun config(self: &Model): &Config {
        &self.config
    }
}
