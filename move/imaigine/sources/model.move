module imaigine::model {
    use sui::package;
    use std::string::String;
    use sui::transfer_policy::{Self, TransferPolicy, TransferRequest};
    
    public struct Model has key, store {
        id: UID,
        owner: address,
        weights_link: String,
        trigger_word: String,
        image_url: String,
        is_published: bool,
        model_type: String,
    }

    public struct MODEL has drop {}

    #[allow(lint(share_owned))]
    fun init(otw: MODEL, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let (model_policy, model_policy_cap) = transfer_policy::new<Model>(&publisher, ctx);

        transfer::public_share_object(model_policy);
        transfer::public_transfer(model_policy_cap, ctx.sender());

        transfer::public_transfer(publisher, ctx.sender());
    }

    public fun confirm_request(policy: &TransferPolicy<Model>, request: TransferRequest<Model>) {
        transfer_policy::confirm_request<Model>(policy, request);
    }

    entry public fun create(weights_link: String, trigger_word: String, image_url: String, model_type: String, ctx: &mut TxContext) {
        let model = Model {
            id: object::new(ctx),
            owner: ctx.sender(),
            weights_link,
            trigger_word,
            image_url,
            is_published: false,
            model_type,
        };
        
        transfer::public_transfer(model, ctx.sender());
    }

    entry public fun publish_model(self: &mut Model) {
        self.is_published = true;
    }

    public fun set_owner(self: &mut Model, owner: address) {
        self.owner = owner;
    }
}