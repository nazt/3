import { TransactionReceipt } from '@ethersproject/providers'
import BigNumber from 'bignumber.js'
import { makeAutoObservable } from 'mobx'
import { CallParams } from '../../../type'
import { helper } from '../../lib/helper'
import { rootStore } from '../index'
import { BooleanState } from '../standard/base'

export interface ContractState {
  address: string
  abi: any
}

export class ReadFunction<V = BigNumber, T = any[]> {
  name: string
  value: V
  contract: ContractState
  autoLoad: boolean = false
  constructor(args: Partial<ReadFunction<V, T>>) {
    Object.assign(this, args)
    makeAutoObservable(this)
  }
  preMulticall(args: Partial<CallParams<T>>): Partial<CallParams<T>> {
    return Object.assign(
      { address: this.contract.address, abi: this.contract.abi, method: this.name, handler: this.value },
      args
    )
  }
}

export class WriteFunction<T> {
  name: string
  contract: ContractState
  loading = new BooleanState()
  onAfterCall: (call: { args: Partial<CallParams<T>>; receipt: TransactionReceipt }) => void
  constructor(args: Partial<WriteFunction<T>>) {
    Object.assign(this, args)
    makeAutoObservable(this)
  }

  get network() {
    return rootStore.god.currentNetwork
  }

  async call(args: Partial<CallParams<T>>) {
    try {
      this.loading.setValue(true)
      //@ts-ignore
      const _args: CallParams = args
      const res = await this.network.execContract(
        Object.assign({ address: this.contract.address, abi: this.contract.abi, method: this.name }, _args)
      )
      res.wait().then(async (receipt) => {
        this.loading.setValue(false)
        if (this.onAfterCall) {
          this.onAfterCall({ args, receipt })
        }
      })
      return res
    } catch (error) {
      console.log(error)
      this.loading.setValue(false)
      helper.toast({ title: error.data?.message || error.message, status: 'error' })
      throw new Error(error.message)
    }
  }
}
