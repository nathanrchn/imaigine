module imaigine::imaigine {
    use sui::sui::SUI;
    use sui::coin::Coin;
    use sui::balance::{Self, Balance};
    use sui::transfer_policy::TransferPolicy;
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use imaigine::model::{Model, confirm_request};

    public struct Imaigine has key {
        id: UID,
        kiosks: vector<address>,
        balance: Balance<SUI>
    }

    fun init(ctx: &mut TxContext) {
        let imaigine = Imaigine {
            id: object::new(ctx),
            kiosks: vector::empty(),
            balance: balance::zero()
        };

        transfer::share_object(imaigine);
    }

    public fun add_kiosk(imaigine: &mut Imaigine, kiosk: &Kiosk) {
        vector::push_back(&mut imaigine.kiosks, object::id_address(kiosk));
    }

    public fun remove_kiosk(imaigine: &mut Imaigine, kiosk: &Kiosk) {
        let (found, index) = vector::index_of(&imaigine.kiosks, &object::id_address(kiosk));
        assert!(found, 1);
        vector::remove(&mut imaigine.kiosks, index);
    }

    public fun new(imaigine: &mut Imaigine, ctx: &mut TxContext): KioskOwnerCap {
        let (kiosk, cap) = kiosk::new(ctx);

        vector::push_back(&mut imaigine.kiosks, object::id_address(&kiosk));
        transfer::public_share_object(kiosk);
        cap
    }

    entry public fun publish_model(model: Model, price: u64, kiosk: &mut Kiosk, cap: &KioskOwnerCap) {
        kiosk::place_and_list(kiosk, cap, model, price)
    }

    public fun buy_model(model: address, kiosk: &mut Kiosk, payment: Coin<SUI>, policy: &TransferPolicy<Model>): Model {
        let (model, request) = kiosk::purchase<Model>(kiosk, object::id_from_address(model), payment);

        confirm_request(policy, request);
        model
    }
}
