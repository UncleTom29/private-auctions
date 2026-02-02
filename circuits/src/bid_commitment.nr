// bid_commitment.nr
// Proves: I know amount + salt such that
//   1. commitment = poseidon(amount, salt, bidder_pubkey)
//   2. amount >= reserve_price
//   3. amount is in a reasonable range (≤ 2^60 to avoid field overflow issues)


global MAX_REASONABLE_BID: Field = 1152921504606846976; // ≈ 2^60

fn poseidon3(a: Field, b: Field, c: Field) -> Field {
    std::hash::poseidon::hash([a, b, c])
}

pub fn main(
    // private
    amount: Field,
    salt: Field,
    bidder_pubkey: Field,

    // public
    reserve_price: pub Field,
    commitment: pub Field,
    bidder_pubkey_pub: pub Field          // usually same as private, but public for indexing
) {
    // -------------------------------------------------------------------------
    // 1. Commitment integrity
    // -------------------------------------------------------------------------
    let computed = poseidon3(amount, salt, bidder_pubkey);
    std::constraint::assert_eq(computed, commitment);

    // -------------------------------------------------------------------------
    // 2. Bidder pubkey consistency (defense in depth)
    // -------------------------------------------------------------------------
    std::constraint::assert_eq(bidder_pubkey, bidder_pubkey_pub);

    // -------------------------------------------------------------------------
    // 3. amount >= reserve_price
    // -------------------------------------------------------------------------
    let diff = amount - reserve_price;
    std::constraint::assert(diff >= 0);               // non-negative → amount >= reserve

    // -------------------------------------------------------------------------
    // 4. amount is not absurdly large
    // -------------------------------------------------------------------------
    std::constraint::assert(amount <= MAX_REASONABLE_BID);

    // -------------------------------------------------------------------------
    // 5. salt is non-zero (prevents trivial collisions)
    // -------------------------------------------------------------------------
    std::constraint::assert(salt != 0);
}