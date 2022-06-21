import { ethereum, BigInt, BigDecimal, Address, dataSource, store, log } from "@graphprotocol/graph-ts";
import {
  Deposit,
  EmergencyWithdraw,
  MasterChef66,
  Withdraw
} from "../generated/MasterChef66/MasterChef66"
import { Holder } from "../generated/schema"
import { toDecimal, loadOrCreateTransaction } from "./utils"


function updateBalance(eth_transaction: ethereum.Transaction, eth_block: ethereum.Block, pid: BigInt, holderAddress: Address, value: BigInt, increase: boolean): void {

  if (holderAddress.toHex() === '0x0000000000000000000000000000000000000000') return;

  let holderId = holderAddress.toHex();
  let holder = Holder.load(holderId);

  let transaction = loadOrCreateTransaction(eth_transaction, eth_block);
  transaction.holder = holderId;
  transaction.type = increase ? value.equals(BigInt.fromI32(0)) ? 'claim' : 'deposit' : 'withdraw';
  transaction.save()

  // get stake block from master chef
  const contract = MasterChef66.bind(Address.fromString(dataSource.address().toHex()));
  const stakedBlock = contract.getUserStakeBlock(pid, holderAddress);

  if (!holder) {
    holder = new Holder(holderId);
    holder.user = holderAddress;
    holder.pid = pid;
    holder.balance = new BigDecimal(new BigInt(0));
    holder.stakedBlock = BigInt.fromI32(0);
    holder.updatedAt = eth_block.timestamp;
    holder.count = BigInt.fromI32(0)
  }

  const balance = increase ? holder.balance.plus(toDecimal(value, 18)) : holder.balance.minus(toDecimal(value, 18));
  holder.balance = balance;
  holder.updatedAt = eth_block.timestamp;
  holder.stakedBlock = eth_block.number.minus(stakedBlock);
  holder.count = holder.count.plus(BigInt.fromI32(1));
  holder.save();

  // if (balance.le(BigDecimal.fromString("0"))) {
  //   log.info(`Holder removed: {}`, [holderId]);
  //   store.remove("Holder", holderId);
  // }
}

export function handleDeposit(event: Deposit): void {
  const holderAddress = event.params.user;
  const eth_transaction = event.transaction;
  const eth_block = event.block;
  const pid = event.params.pid;
  const value = event.params.amount;

  updateBalance(eth_transaction, eth_block, pid, holderAddress, value, true)
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  const holderAddress = event.params.user;
  const eth_transaction = event.transaction;
  const eth_block = event.block;
  const pid = event.params.pid;
  const value = event.params.amount;

  updateBalance(eth_transaction, eth_block, pid, holderAddress, value, false)
}

export function handleWithdraw(event: Withdraw): void {
  const holderAddress = event.params.user;
  const eth_transaction = event.transaction;
  const eth_block = event.block;
  const pid = event.params.pid;
  const value = event.params.amount;

  updateBalance(eth_transaction, eth_block, pid, holderAddress, value, false)
}
