import { Sequelize, DataTypes, Op } from "sequelize";
export const sequelize = new Sequelize(
  process.env.POSTGRES_DB || "faucet",
  process.env.POSTGRES_USER || "postgres",
  process.env.POSTGRES_PASSWORD || "test",
  {
    host: process.env.POSTGRES_HOST || "localhost",
    port: (process.env.POSTGRES_PORT || 5432) as any,
    dialect: "postgres",
    dialectOptions: {
      ssl: process.env.POSTGRES_SSL == "true",
    },
  }
);
export const User = sequelize.define("user", {
  sub: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  picture: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
export const Transaction = sequelize.define("transaction", {
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});
export const BlockedAddress = sequelize.define("blockedAddress", {
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: false,
  },
  // lastTime: {
  //   type: DataTypes.TIME,
  //   allowNull: false,
  //   unique: false,
  // },
});

export const UserRecord = sequelize.define("userRecord", {
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: false,
  },
  // lastTime: {
  //   type: DataTypes.TIME,
  //   allowNull: false,
  //   unique: false,
  // },
});

export const latestTransactionSince = async (user: any, date: any) => {
  return await Transaction.findOne({
    where: {
      userId: user.id,
      createdAt: {
        [Op.gt]: date,
      },
      transactionHash: {
        [Op.not]: null,
      },
    },
    order: [["createdAt", "DESC"]],
  });
};

// Transaction.belongsTo(User, {
//   foreignKey: { allowNull: false },
//   onDelete: "CASCADE",
// });
// User.hasMany(Transaction, {
//   foreignKey: { allowNull: false },
//   onDelete: "CASCADE",
// });
