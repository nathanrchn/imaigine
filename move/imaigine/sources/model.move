module imaigine::model {
    use sui::package;
    use std::string::String;
    use sui::transfer_policy::{Self, TransferPolicy, TransferRequest};
    
    public struct Model has key, store {
        id: UID,
        weights_link: String,
        trigger_word: String,
        image_url: String,
        is_published: bool,
    }

    public struct MODEL has drop {}

    #[allow(lint(share_owned))]
    fun init(otw: MODEL, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let (policy, policy_cap) = transfer_policy::new<Model>(&publisher, ctx);

        transfer::public_share_object(policy);
        transfer::public_transfer(policy_cap, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
    }

    public fun confirm_request(policy: &TransferPolicy<Model>, request: TransferRequest<Model>) {
        transfer_policy::confirm_request<Model>(policy, request);
    }

    entry public fun create(weights_link: String, trigger_word: String, image_url: String, ctx: &mut TxContext) {
        let model = Model {
            id: object::new(ctx),
            weights_link,
            trigger_word,
            image_url,
            is_published: false,
        };
        
        transfer::public_transfer(model, ctx.sender());
    }

    entry public fun publish_model(self: &mut Model) {
        self.is_published = true;
    }

    public fun weights_link(self: &Model): String {
        self.weights_link
    }
}
