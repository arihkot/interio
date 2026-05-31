import { isConnected, getAddress, signTransaction, getNetworkDetails } from "@stellar/freighter-api";
import {
  rpc,
  Networks,
  TransactionBuilder,
  xdr,
  Address,
} from "@stellar/stellar-sdk";

const CONTRACT_ID = "CD2V73KLOFGWJTQNKTBIHQMPXKHE5MPYOA4QCH422M365XXKACDRM76W";
const RPC_URL = "https://soroban-testnet.stellar.org";

export async function getPublicKey(): Promise<string | null> {
  try {
    const connected = await isConnected();
    if (!connected.isConnected) return null;
    const info = await getAddress();
    return info.address || null;
  } catch {
    return null;
  }
}

export async function mintNftClient(params: {
  totalCost: string;
  maintenance: string;
  modelUrl: string;
  name: string;
}): Promise<{ status: string; explorer_url?: string; message: string }> {
  try {
    const address = await getAddress();
    if (!address.address) {
      return { status: "error", message: "Freighter wallet not connected" };
    }

    const rpcServer = new rpc.Server(RPC_URL);
    const networkDetails = await getNetworkDetails();
    const networkPassphrase = networkDetails.networkPassphrase || Networks.TESTNET;

    const sourceAddress = address.address;
    const source = await rpcServer.getAccount(sourceAddress);

    const nftId = Math.floor(Math.random() * 1000000) + 1;

    const toScVal = new Address(sourceAddress).toScVal();
    const idScVal = xdr.ScVal.scvU32(nftId);
    const nameScVal = xdr.ScVal.scvString(params.name);
    const urlScVal = xdr.ScVal.scvString(params.modelUrl);
    const costScVal = xdr.ScVal.scvString(params.totalCost);
    const maintScVal = xdr.ScVal.scvString(params.maintenance);

    const scValArgs: xdr.ScVal[] = [
      toScVal,
      idScVal,
      nameScVal,
      urlScVal,
      costScVal,
      maintScVal,
    ];

    const contractAddress = Address.fromString(CONTRACT_ID);

    const invokeContractArgs = new xdr.InvokeContractArgs({
      contractAddress: contractAddress.toScAddress(),
      functionName: "mint",
      args: scValArgs,
    });

    const hostFunction = xdr.HostFunction.hostFunctionTypeInvokeContract(
      invokeContractArgs
    );

    const invokeHostFunctionOp = new xdr.InvokeHostFunctionOp({
      hostFunction,
      auth: [],
    });

    const operationBody = xdr.OperationBody.invokeHostFunction(
      invokeHostFunctionOp
    );

    const operation = new xdr.Operation({
      sourceAccount: null,
      body: operationBody,
    });

    const tx = new TransactionBuilder(source, {
      fee: "100000",
      networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResponse = await rpcServer.simulateTransaction(tx);
    if ("error" in simResponse) {
      return {
        status: "error",
        message: `Simulation failed: ${simResponse.error}`,
      };
    }

    const assembled = rpc.assembleTransaction(tx, simResponse);
    const assembledTx = assembled.build();

    const signed = await signTransaction(assembledTx.toXDR(), {
      networkPassphrase,
    });

    if (!signed.signedTxXdr) {
      return {
        status: "error",
        message:
          signed.error?.message || "Transaction signing rejected by Freighter",
      };
    }

    const signedTx = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      networkPassphrase
    );

    const submitResponse = await rpcServer.sendTransaction(signedTx);
    if (submitResponse.status === "ERROR") {
      return {
        status: "error",
        message: `Submission failed: ${JSON.stringify(submitResponse)}`,
      };
    }

    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${submitResponse.hash}`;

    return {
      status: "success",
      explorer_url: explorerUrl,
      message: "NFT minted successfully on Stellar Testnet via Freighter!",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Client minting failed";
    return { status: "error", message };
  }
}
