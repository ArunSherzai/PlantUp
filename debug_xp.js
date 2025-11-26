const MAX_LEVEL = 100;
const XP_TABLE: number[] = [];

for (let i = 1; i <= MAX_LEVEL + 1; i++) {
    if (i === 1) {
        XP_TABLE.push(0);
        continue;
    }
    let xp = 0;
    if (i <= 51) {
        xp = Math.floor(66 * Math.pow(i - 1, 2));
    } else {
        xp = Math.floor(40 * Math.pow(i - 1, 2) + 1000 * (i - 1));
    }
    XP_TABLE.push(xp);
}

console.log('Level 1:', XP_TABLE[0]);
console.log('Level 2:', XP_TABLE[1]);
console.log('Level 3:', XP_TABLE[2]);
console.log('Level 4:', XP_TABLE[3]);
console.log('Level 5:', XP_TABLE[4]);
console.log('Level 6:', XP_TABLE[5]);
