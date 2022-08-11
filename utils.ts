import jwtAuthz from "express-jwt-authz";
import { Sequelize, DataTypes, Op } from "sequelize";
import { BlockedAddress, latestTransactionSince, UserRecord } from "./database";
import * as faucet from "./faucet";
import client from "prom-client";
import { ethToEthermint, ethermintToEth } from "@hanchon/ethermint-address-converter";

const ADDRESS_PREFIX = process.env.ADDRESS_PREFIX || "uptick";

const FAUCET_WAIT_PERIOD = process.env.FAUCET_WAIT_PERIOD || "24h";

const counterBlockedAddress = new client.Counter({
  name: "faucet_blocked_address_count",
  help: "faucet_blocked_address_count is the number of times the a block address requested a drip",
});

const counterCooldown = new client.Counter({
  name: "faucet_cool_down_count",
  help: "faucet_cool_down_count is the number of times the an address needed to cool down",
});

const counterForbidden = new client.Counter({
  name: "faucet_forbidden_count",
  help: "faucet_forbidden_count is the number of times the authorization was forbidden",
});

export const ensurePermission = jwtAuthz(["manage:faucet"], {
  customScopeKey: "permissions",
});

export async function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.user) return next();

  counterForbidden.inc();
  res.status(403).send(JSON.stringify({ error: "Forbidden" }));
}

export async function rateLimit(req: any, res: any, next: any) {
  // if (req.user.id) {
  //   let cooldownDate = new Date(
  //     (new Date() as any) - (faucet as any).getWaitPeriod()
  //   );
  //   let transaction = await latestTransactionSince(req.user, cooldownDate);
  //   if (transaction) {
  //     counterCooldown.inc();
  //     return res.status(403).send(JSON.stringify({ error: "Cooldown" }));
  //   }
  // }
  next();
}

export async function userLimit(req: any, res: any, next: any) {
  let { userName } = req.body;
  if (userName) {
    let cooldownDate = new Date(
      (new Date() as any) - (faucet as any).getWaitPeriod()
    );
    let blocked = await UserRecord.findOne({
      where: {
        userName: userName.trim(),
        createdAt: {
          [Op.gt]: cooldownDate,
        },
      },
      order: [["createdAt", "DESC"]],
    });
    if (blocked) {
      counterBlockedAddress.inc();
      return res.status(403).send(JSON.stringify({ error: "The user has already collected it, please come back " + FAUCET_WAIT_PERIOD + " later" }));
    }
  }
  next();
}

function invalidAddress(res: any) {
  res.status(422).send(JSON.stringify({ error: "invalid address" }));
}

export async function blockedAddresses(req: any, res: any, next: any) {
  var { address } = req.body;
  var addressHex;
  try {
    if (address.length < 2) return invalidAddress(res);
    // Hex encoded address
    if (address[0] === "0" && address[1] === "x") {
      if (ethermintToEth(ethToEthermint(address)) !== address) return invalidAddress(res);
      addressHex = address
    } else {
      addressHex = ethermintToEth(address)
      // Ethermint address
      if (!address.includes(ADDRESS_PREFIX)) return invalidAddress(res);
      if (ethToEthermint(ethermintToEth(address)) !== address) return invalidAddress(res);
    }
  } catch (error) {
    return invalidAddress(res)
  }

  if (address) {
    let cooldownDate = new Date(
      (new Date() as any) - (faucet as any).getWaitPeriod()
    );
    let blocked = await BlockedAddress.findOne({
      where: {
        address: addressHex.trim(),
        createdAt: {
          [Op.gt]: cooldownDate,
        },
      },
      order: [["createdAt", "DESC"]],
    });
    if (blocked) {
      counterBlockedAddress.inc();
      return res.status(403).send(JSON.stringify({ error: "The address has already collected it, please come back " + FAUCET_WAIT_PERIOD + " later" }));
    }
  }
  next();
}
