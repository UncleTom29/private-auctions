// src/utils.nr
// Shared helpers — reduces duplication across circuits



pub fn poseidon_hash_2(a: Field, b: Field) -> Field {
    std::hash::poseidon::hash([a, b])
}

pub fn poseidon_hash_3(a: Field, b: Field, c: Field) -> Field {
    std::hash::poseidon::hash([a, b, c])
}

pub fn poseidon_hash_4(a: Field, b: Field, c: Field, d: Field) -> Field {
    std::hash::poseidon::hash([a, b, c, d])
}

// Very simple range check wrapper (hackathon-friendly)
pub fn constrain_in_range(value: Field, min: Field, max: Field) {
    let diff_low  = value - min;
    let diff_high = max - value;

    std::range::assert_range(diff_low,  0, max - min);
    std::range::assert_range(diff_high, 0, max - min);
}

// Useful for timestamps, amounts, etc.
pub fn constrain_non_negative(value: Field) {
    std::range::assert_range(value, 0, 18446744073709551615);
}