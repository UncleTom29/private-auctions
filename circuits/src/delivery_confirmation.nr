// delivery_confirmation.nr
// Proves: address match + tracking + time window
// For hackathon: simplified timestamps (unix seconds)


global MIN_DELAY: Field = 86400;  // 24h
global MAX_WINDOW: Field = 2592000;  // 30d

struct DeliveryProof {
    shipping_address_hash: Field,
    tracking_number: Field,
    delivery_timestamp: Field,
    carrier_code: Field,
    recipient_name_hash: Field,
}

struct DeliveryContext {
    auction_id: Field,
    auction_end_time: Field,
    buyer_address_hash: Field,
    expected_tracking: Field,
}

fn compute_confirmation_hash(proof: DeliveryProof, context: DeliveryContext, salt: Field) -> Field {
    std::hash::poseidon::hash([
        proof.shipping_address_hash,
        proof.tracking_number,
        proof.delivery_timestamp,
        proof.carrier_code,
        proof.recipient_name_hash,
        context.auction_id,
        context.auction_end_time,
        context.buyer_address_hash,
        context.expected_tracking,
        salt
    ])
}

pub fn main(
    // Private
    proof: DeliveryProof,
    salt: Field,
    // Public
    context: pub DeliveryContext,
    confirmation_hash: pub Field,
    current_time: pub Field
) {
    // Hash match
    let computed = compute_confirmation_hash(proof, context, salt);
    std::constraint::assert_eq(computed, confirmation_hash);

    // Address match
    std::constraint::assert_eq(proof.shipping_address_hash, context.buyer_address_hash);

    // Tracking match
    std::constraint::assert_eq(proof.tracking_number, context.expected_tracking);

    // Time window
    let since_end = proof.delivery_timestamp - context.auction_end_time;
    std::range::assert_range(since_end, MIN_DELAY, MAX_WINDOW);

    // Not in future
    let from_now = current_time - proof.delivery_timestamp;
    std::range::assert_range(from_now, 0, MAX_WINDOW);
}

// Test example
#[test]
fn test_valid_delivery() {
    let proof = DeliveryProof {
        shipping_address_hash: 0xABC,
        tracking_number: 0xTRACK1,
        delivery_timestamp: 1700000000,
        carrier_code: 1,
        recipient_name_hash: 0xNAME1,
    };

    let context = DeliveryContext {
        auction_id: 0xAUCT1,
        auction_end_time: 1699000000,
        buyer_address_hash: 0xABC,
        expected_tracking: 0xTRACK1,
    };

    let salt = 123;
    let hash = compute_confirmation_hash(proof, context, salt);

    main(proof, salt, context, hash, 1701000000);
}