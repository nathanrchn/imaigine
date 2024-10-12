module imaigine::imaigine {
    use sui::sui::SUI;
    use std::string::String;
    use sui::coin::{Self, Coin};
    use imaigine::model::Config;
    use kiosk::royalty_rule::Self;
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use imaigine::model::{Model, confirm_request};
    use sui::transfer_policy::{Self, TransferPolicy, TransferRequest};

    public struct Imaigine has key {
        id: UID,
        kiosks: vector<address>
    }

    public struct LockedKioskOwnerCap has key {
        id: UID,
        owner: address,
        cap: Option<KioskOwnerCap>
    }

    public struct Borrow {
        owned_id: ID,
        cap_id: ID
    }

    fun init(ctx: &mut TxContext) {
        let imaigine = Imaigine {
            id: object::new(ctx),
            kiosks: vector::empty()
        };

        transfer::share_object(imaigine);
    }

    entry fun default(imaigine: &mut Imaigine, ctx: &mut TxContext) {
        transfer::transfer(new(imaigine, ctx), ctx.sender());
    }

    public fun new(imaigine: &mut Imaigine, ctx: &mut TxContext): LockedKioskOwnerCap {
        let (kiosk, cap) = kiosk::new(ctx);

        vector::push_back(&mut imaigine.kiosks, object::id_address(&kiosk));
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

    public fun use_model(model: ID, kiosk: &mut Kiosk, locked_cap: &LockedKioskOwnerCap, ctx: &mut TxContext): (&Config, TransferRequest<Config>) {
        let cap = option::borrow<KioskOwnerCap>(&locked_cap.cap);
        let model = kiosk::borrow<Model>(kiosk, cap, model);

        let config = model.config();

        let request = transfer_policy::new_request<Config>(
            object::id(config),
            1,
            object::id_from_address(ctx.sender()),
        );

        (config, request)
    }

    public fun pay_for_model_use(payment: Coin<SUI>, policy: &mut TransferPolicy<Config>, request: &mut TransferRequest<Config>) {
        royalty_rule::pay<Config>(policy, request, payment);
    }

    public fun confirm_model_use(policy: &TransferPolicy<Config>, request: TransferRequest<Config>) {
        transfer_policy::confirm_request<Config>(policy, request);
    }

    public fun buy_model(model: ID, kiosk: &mut Kiosk, payment: Coin<SUI>, policy: &TransferPolicy<Model>): Model {
        let (model, request) = kiosk::purchase<Model>(kiosk, model, payment);

        confirm_request(policy, request);
        model
    }
}
