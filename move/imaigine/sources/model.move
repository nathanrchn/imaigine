module imaigine::model {
    use std::string::String;
    
    public struct Model has key, store {
        id: UID,
        creator: address,
        weights_link: String,
        trigger_word: String,
        image_url: String,
        is_listed: bool,
    }

    entry public fun create(weights_link: String, trigger_word: String, image_url: String, ctx: &mut TxContext) {
        let model = Model {
            id: object::new(ctx),
            creator: ctx.sender(),
            weights_link,
            trigger_word,
            image_url,
            is_listed: false,
        };
        
        transfer::public_transfer(model, ctx.sender());
    }

    entry public fun list_model(self: &mut Model) {
        self.is_listed = true;
    }
}
