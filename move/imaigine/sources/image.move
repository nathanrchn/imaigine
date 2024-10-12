module imaigine::image {
    use std::string::String;

    public struct Image has key {
        id: UID,
        name: String,
        url: String,
        model: address,
    }

    entry public fun create(name: String, url: String, model: address, ctx: &mut TxContext) {
        let image = Image {
            id: object::new(ctx),
            name,
            url,
            model,
        };
        
        transfer::transfer(image, ctx.sender());
    }
}
