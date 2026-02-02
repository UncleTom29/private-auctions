use bid_commitment;
use winner_selection;
use delivery_confirmation;


pub fn prove_bid(
    bid_amount: Field,
    random_salt: Field,
    bidder_pubkey: Field,
    reserve_price: Field,          // public
    commitment_hash: Field         // public
) {
    bid_commitment::main(
        bid_amount,
        random_salt,
        bidder_pubkey,
        reserve_price,
        commitment_hash
    );
}

pub fn prove_winner(
    bids: [winner_selection::RevealedBid; 32],
    bid_count: Field,
    winner_index: Field,
    winner_pubkey: Field,
    winning_amount: Field,
    second_price: Field
) {
    winner_selection::main(
        bids,
        bid_count,
        winner_index,
        winner_pubkey,
        winning_amount,
        second_price
    );
}
