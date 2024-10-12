module imaigine::image {
    use sui::package;
    use sui::display;
    use std::string::String;

    public struct Image has key {
        id: UID,
        name: String,
        url: String,
        model: address,
    }

    public struct IMAGE has drop {}

    fun init(otw: IMAGE, ctx: &mut TxContext) {
        let keys = vector[
            b"name".to_string(),
            b"link".to_string(),
            b"image_url".to_string(),
            b"project_url".to_string(),
            b"creator".to_string(),
        ];

        let values = vector[
            b"{name}".to_string(),
            b"https://imaigine-sui.vercel.app/generate/{model}".to_string(),
            b"{url}".to_string(),
            b"{project_url}".to_string(),
            b"{model}".to_string(),
        ];

        let publisher = package::claim(otw, ctx);
        let mut display = display::new_with_fields<Image>(
            &publisher, keys, values, ctx
        );

        display.update_version();

        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_transfer(display, ctx.sender());
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
