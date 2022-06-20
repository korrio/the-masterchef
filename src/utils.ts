
import { ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Transaction } from "../generated/schema";

export const DEFAULT_DECIMALS = 18;

export function toDecimal(
  value: BigInt,
  decimals: number = DEFAULT_DECIMALS
): BigDecimal {
  let precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return value.divDecimal(precision);
}

export function loadOrCreateTransaction(
  eth_transaction: ethereum.Transaction,
  eth_block: ethereum.Block
): Transaction {
  let transaction = Transaction.load(eth_transaction.hash.toHex());
  if (!transaction) {
    transaction = new Transaction(eth_transaction.hash.toHex());
    transaction.timestamp = eth_block.timestamp;
    transaction.blockNumber = eth_block.number;
    transaction.blockHash = eth_block.hash;
    transaction.from = eth_transaction.from;
    transaction.to = eth_transaction.to;
    transaction.value = eth_transaction.value;
    transaction.gasUsed = eth_transaction.gasLimit;
    transaction.gasPrice = eth_transaction.gasPrice;
    transaction.save();
  }
  return transaction as Transaction;
}