module imaigine::imaigine {
    use sui::sui::SUI;
    use sui::coin::Coin;
    use std::string::String;
    use sui::transfer_policy::TransferPolicy;
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use imaigine::model::{Model, confirm_request};

    public struct LockedKioskOwnerCap has key {
        id: UID,
        owner: address,
        cap: Option<KioskOwnerCap>
    }

    public struct Borrow {
        owned_id: ID,
        cap_id: ID
    }

    entry fun default(ctx: &mut TxContext) {
        transfer::transfer(new(ctx), ctx.sender());
    }

    public fun new(ctx: &mut TxContext): LockedKioskOwnerCap {
        let (kiosk, cap) = kiosk::new(ctx);

       transfer::public_share_object(kiosk);

        LockedKioskOwnerCap {
            id: object::new(ctx),
            owner: ctx.sender(),
            cap: option::some(cap)
        }
    }

    public fun borrow_val(self: &mut LockedKioskOwnerCap, ctx: &mut TxContext): (KioskOwnerCap, Borrow) {
        assert!(ctx.sender() == self.owner, 0);

        let cap = option::extract(&mut self.cap);
        let id = object::id(&cap);

        (cap, Borrow { owned_id: object::id(self), cap_id: id })
    }

    public fun return_val(self: &mut LockedKioskOwnerCap, cap: KioskOwnerCap, borrow: Borrow) {
        let Borrow { owned_id, cap_id } = borrow;

        assert!(object::id(self) == owned_id, 0);
        assert!(object::id(&cap) == cap_id, 1);

        option::fill(&mut self.cap, cap)
    }

    entry public fun publish_model(model: Model, price: u64, kiosk: &mut Kiosk, cap: &KioskOwnerCap) {
        kiosk::place_and_list(kiosk, cap, model, price)
    }

    entry public fun use_model(model: ID, kiosk: &Kiosk, locked_cap: &LockedKioskOwnerCap): String {
        let cap = option::borrow<KioskOwnerCap>(&locked_cap.cap);

        let model = kiosk::borrow<Model>(kiosk, cap, model);

        model.weights_link()
    }

    public fun buy_model(model: ID, kiosk: &mut Kiosk, payment: Coin<SUI>, policy: &TransferPolicy<Model>): Model {
        let (model, request) = kiosk::purchase<Model>(kiosk, model, payment);

        confirm_request(policy, request);
        model
    }
}
