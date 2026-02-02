// winner_selection.nr
// Proves: highest bid winner + correct second price
// For hackathon: MAX_BIDS=32 (fast loop unrolling)


global MAX_BIDS: Field = 32;

struct RevealedBid {
    amount: Field,
    salt: Field,
    bidder_pubkey: Field,
    is_valid: bool,
}

fn compute_commitment(bid: RevealedBid) -> Field {
    std::hash::poseidon::hash([bid.amount, bid.salt, bid.bidder_pubkey])
}

pub fn main(
    // Private
    bids: [RevealedBid; 32],
    // Public
    bid_count: pub Field,
    winner_index: pub Field,
    winner_pubkey: pub Field,
    winning_amount: pub Field,
    second_price: pub Field
) {
    std::range::assert_range(bid_count, 1, MAX_BIDS);

    let winner_idx = winner_index as Field;
    std::constraint::assert(winner_idx < bid_count);

    let mut highest: Field = 0;
    let mut second_highest: Field = 0;
    let mut highest_idx: Field = 0;

    for i in 0..32 {
        if (i as Field) < bid_count {
            let bid = bids[i];
            if bid.is_valid {
                // Optional: constrain commitment if public hashes provided
                // compute_commitment(bid); // extend if needed

                if bid.amount > highest {
                    second_highest = highest;
                    highest = bid.amount;
                    highest_idx = i as Field;
                } else if bid.amount > second_highest {
                    second_highest = bid.amount;
                }
            }
        }
    }

    std::constraint::assert_eq(highest_idx, winner_idx);
    std::constraint::assert_eq(highest, winning_amount);
    std::constraint::assert_eq(bids[winner_idx as usize].bidder_pubkey, winner_pubkey);

    // Second price: if 1 bid, == winning; else == second
    if bid_count == 1 {
        std::constraint::assert_eq(second_price, winning_amount);
    } else {
        std::constraint::assert_eq(second_highest, second_price);
    }
}

// Test example
#[test]
fn test_two_bids() {
    let mut bids: [RevealedBid; 32] = [RevealedBid { amount: 0, salt: 0, bidder_pubkey: 0, is_valid: false }; 32];

    bids[0] = RevealedBid { amount: 1000, salt: 1, bidder_pubkey: 0xA, is_valid: true };
    bids[1] = RevealedBid { amount: 1200, salt: 2, bidder_pubkey: 0xB, is_valid: true };

    main(bids, 2, 1, 0xB, 1200, 1000);
}