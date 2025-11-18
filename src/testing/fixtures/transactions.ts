export interface TransactionSnapshot {
  hash: string;
  tick: number;
  amount: bigint;
  sourceIdentity: string;
  destinationIdentity: string;
}

export const HistoricalTransactionSnapshots: TransactionSnapshot[] = [
  {
    hash: "9b9d3ef097c9c6f3a80f5fbd712a6b7dc734b9b98ccf2ad7f8a6b00000000000",
    tick: 5_600_050,
    amount: BigInt("1000000000"),
    sourceIdentity: "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK",
    destinationIdentity: "XQCLNHCEHTKQZDBAHJFVVTRMWFACMAZOBAEDQHEITGGEWZDIBRAIYWPGEONG",
  },
  {
    hash: "abc13ef097c9c6f3a80f5fbd712a6b7dc734b9b98ccf2ad7f8a6b00000000001",
    tick: 5_600_120,
    amount: BigInt("2500000000"),
    sourceIdentity: "LVRGSAJQRAFELGGAHVAGJLKCGUDDOAEVSDEJAAEGNEVJWQRWDPHOBYHFCJCK",
    destinationIdentity: "TKUWWSNBAEGWJHQJDFLGQHJJCJBAXBSQMQAZJJDYXEPBVBBLIQANJTIDXMQH",
  },
];
