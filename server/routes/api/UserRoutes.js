const User = require('../../models/User');
const UserSession = require('../../models/UserSession');
const Products = require('../../models/Products');
const helper = require('../../models/externalFunctions');
const UserInformation = require('../../models/UserInformation');
module.exports = app => {
  app.post('/api/account/signup', (req, res, next) => {
    const { body } = req;
    const { firstName, lastName, password } = body;
    let { email } = body;

    if (!firstName) {
      return res.send({
        success: false,
        message: 'FirstName cannot be blank'
      });
    } else if (!lastName) {
      return res.send({
        success: false,
        message: 'LastName cannot be blank'
      });
    } else if (!password) {
      return res.send({
        success: false,
        message: 'Passowrd cannot be blank'
      });
    } else if (!email) {
      return res.send({
        success: false,
        message: 'Email cannot be blank'
      });
    }

    email = email.toLowerCase();
    User.find(
      {
        email: email
      },
      (err, previousUsers) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Server Error'
          });
        } else if (previousUsers.length > 0) {
          return res.send({
            success: false,
            message: 'User Already Exists'
          });
        } else {
          const newUser = new User();
          newUser.email = email;
          newUser.firstName = firstName;
          newUser.lastName = lastName;
          newUser.password = newUser.generateHash(password);
          console.log(newUser);
          newUser.save((err, user) => {
            if (err) {
              return res.send({
                success: false,
                message: 'Server Error'
              });
            } else {
              return res.send({
                success: true,
                message: 'Successfully Registered'
              });
            }
          });
        }
      }
    );
  });
  app.post('/api/account/signin', (req, res, next) => {
    const { body } = req;
    const { password } = body;
    let { email } = body;
    email = email.toLowerCase();
    if (!email) {
      return res.send({
        success: false,
        message: "Email can't be blank"
      });
    }
    if (!password) {
      return res.send({
        success: false,
        message: "Password can't be blank"
      });
    }
    User.find(
      {
        email: email
      },
      (err, users) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Server Error'
          });
        } else if (users.length !== 1) {
          return res.send({
            success: false,
            message: 'Invalid Access'
          });
        }
        const user = users[0];
        if (!user.validPassword(password, user)) {
          return res.send({
            success: false,
            message: 'Invalid Access'
          });
        }
        let userSession = new UserSession();
        userSession.userId = user._id;
        userSession.save((err, doc) => {
          if (err) {
            return res.send({
              success: false,
              message: 'Server Error'
            });
          }

          return res.send({
            success: true,
            message: 'Authentication Successful',
            token: doc._id,
            userID: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          });
        });
      }
    );
  });
  app.get('/api/account/verify', (req, res, next) => {
    const { query } = req;
    const { token } = query;
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          return res.send({
            success: true,
            message: 'Authorized'
          });
        }
      }
    );
  });
  app.get('/api/account/logout', (req, res, next) => {
    const { query } = req;
    const { token } = query;
    UserSession.findOneAndUpdate(
      {
        _id: token,
        isDeleted: false
      },
      {
        $set: { isDeleted: true }
      },
      null,
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }

        return res.send({
          success: true,
          message: 'Success'
        });
      }
    );
  });
  app.post('/api/account/sellItem', (req, res, next) => {
    const { body } = req;
    const { token } = body;
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          let { itemName, email, price } = req.body;
          let data = {};
          let generatedOrderID = helper.generateOrderID();
          data.orderID = generatedOrderID;
          data.itemName = itemName;
          data.email = email;
          data.price = price;
          console.log(data);
          let postSellingOrder = new Products(data);
          postSellingOrder
            .save()
            .then(result => {
              console.log(result);
              if (result) {
                UserInformation.find({ email: email })
                  .then(user => {
                    let sellingOrders = (user[0] && user[0].sellOrders) || [];
                    sellingOrders.push({ orderID: generatedOrderID });
                    UserInformation.findOneAndUpdate(
                      { email: email },
                      {
                        $set: { sellOrders: sellingOrders }
                      },
                      { upsert: true, new: true }
                    )
                      .then(user => {
                        console.log(user);
                        return res.send({
                          success: true,
                          message: 'Successfully Created',
                          list: user
                        });
                      })
                      .catch(err => {
                        return res.send({
                          success: false,
                          message: 'Internal Server Error'
                        });
                      });
                  })
                  .catch(err => {
                    console.log(err);
                  });
              }
            })
            .catch(err => {
              console.log(err);
            });
        }
      }
    );
  });
  app.post('/api/account/fetchSoldItemForUser', (req, res, next) => {
    const { body } = req;
    const { token, email } = body;
    console.log(token);
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          Products.find({ email })
            .then(prods => {
              if (prods && prods.length > 0) {
                let list = [];
                for (let i in prods) {
                  if (prods[i].email === email && !prods[i].executionStatus) {
                    list.push(prods[i]);
                  }
                }
                return res.send({
                  list
                });
              } else {
                return res.send({
                  success: false
                });
              }
            })
            .catch(err => {});
          // let { email } = req.body;
          // console.log(email);
          // UserInformation.find({ email: email })
          //   .then(user => {
          //     if (user && user.length > 0) {
          //       let sellOrders = [];
          //       for (let i = 0; i < user[0].sellOrders.length; i++) {
          //         sellOrders.push(user[0].sellOrders[i].orderID);
          //       }
          //       console.log(sellOrders);
          //       if (sellOrders.length > 0) {
          //         Products.find({ orderID: { $in: sellOrders } })
          //           .then(resp => {
          //             return res.send({
          //               success: true,
          //               message: 'Successfully Fetched',
          //               list: resp
          //             });
          //           })
          //           .catch(err => {
          //             console.log('error in products', err);
          //             return res.send({
          //               success: false,
          //               message: 'Internal Server Error'
          //             });
          //           });
          //       }
          //     }
          //   })
          //   .catch(err => {
          //     console.log('error in userinfo');
          //   });
        }
      }
    );
  });
  app.post('/api/account/buyOrder', (req, res, next) => {
    const { body } = req;
    const { token } = body;
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          let { email, orderID, bidPrice } = req.body;
          console.log(bidPrice);
          let latest_bidPrice = {};
          let bid_Users = [];
          UserInformation.find({ email })
            .then(succ => {
              if (succ && succ.length > 0) {
                let userSellOrders = (succ && succ[0].sellOrders) || [];
                for (let k in userSellOrders) {
                  if (userSellOrders[k].orderID === orderID) {
                    return res.send({
                      success: false,
                      message: 'Cant buy own orders'
                    });
                  }
                }
              }
              Products.find({ orderID })
                .then(resp => {
                  if (resp && resp.length > 0) {
                    bid_Users = resp[0].bidUsers;
                    if (
                      bid_Users === null ||
                      bid_Users === '' ||
                      bid_Users === undefined
                    ) {
                      bid_Users = [];
                    }
                    bid_Users.push({ email, bidPrice });
                    if (
                      resp[0].maxPricedBid !== undefined &&
                      resp[0].maxPricedBid.length > 0
                    ) {
                      if (resp[0].maxPricedBid[0].bidPrice < bidPrice) {
                        latest_bidPrice = { email, bidPrice };
                      } else {
                        return res.send({
                          message: `Your entered amount is less than max bid price: ${resp[0].maxPricedBid[0].bidPrice} `,
                          faultCode: '303'
                        });
                      }
                    } else {
                      //modified here
                      if (resp[0].price > bidPrice) {
                        return res.send({
                          message: `Your entered amount cannot be less than base price`,
                          faultCode: '303'
                        });
                      } else latest_bidPrice = { email, bidPrice };
                    }
                    console.log(latest_bidPrice);
                    Products.findOneAndUpdate(
                      { orderID },
                      {
                        $set: {
                          bidUsers: bid_Users,
                          maxPricedBid: latest_bidPrice
                        }
                      },
                      { new: true }
                    )
                      .then(response => {
                        UserInformation.find({ email })
                          .then(result => {
                            if (result && result.length > 0) {
                              let userBuyOrders = result[0].buyOrders;
                              let isFound = false;
                              for (let i = 0; i < userBuyOrders.length; i++) {
                                if (userBuyOrders[i].orderID === orderID) {
                                  isFound = true;
                                  break;
                                }
                              }
                              if (!isFound) {
                                userBuyOrders.push({ orderID });
                                UserInformation.findOneAndUpdate(
                                  { email },
                                  {
                                    $set: {
                                      buyOrders: userBuyOrders
                                    }
                                  },
                                  { new: true }
                                )
                                  .then(rep => {
                                    return res.send({
                                      success: true,
                                      message: 'Successfully placed order',
                                      list: rep
                                    });
                                  })
                                  .catch(errSe => {
                                    console.log(errSe);
                                  });
                              } else {
                                return res.send({
                                  success: true,
                                  message: 'Successfully placed order',
                                  list: result
                                });
                              }
                            } else {
                              let data = {};
                              data.email = email;
                              data.buyOrders = [{ orderID }];
                              data.sellOrders = [];
                              data.executedOrders = [];
                              let UserInfo = new UserInformation(data);
                              UserInfo.save()
                                .then(created => {
                                  if (created) {
                                    return res.send({
                                      success: true,
                                      message: 'Successfully placed order',
                                      list: created
                                    });
                                  } else {
                                    res.send({
                                      success: false,
                                      message: 'Internal Server Error'
                                    });
                                  }
                                })
                                .catch(errF => {
                                  console.log(errF);
                                });
                            }
                          })
                          .catch(errS => {
                            console.log(errS);
                          });
                      })
                      .catch(error => {
                        console.log(error);
                      });
                  } else {
                    res.send({
                      success: false,
                      message: 'No Order for the user'
                    });
                  }
                })
                .catch(err => {
                  console.log(err);
                });
            })
            .catch(err => {
              console.log(err);
            });
        }
      }
    );
  });
  //common for all users
  app.post('/api/account/getBuyOrdersForAUser', (req, res, next) => {
    const { body } = req;
    const { token, email } = body;
    console.log(token);
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          Products.find({})
            .then(results => {
              if (results) {
                let res_Searches = [];
                if (results.length > 0) {
                  for (let i = 0; i < results.length; i++) {
                    if (
                      !results[i].executionStatus &&
                      email !== results[i].email
                    ) {
                      res_Searches.push(results[i]);
                    }
                  }
                  if (res_Searches.length > 0) {
                    return res.send({
                      success: true,
                      list: res_Searches
                    });
                  } else {
                    return res.send({
                      success: false,
                      message: 'No records found'
                    });
                  }
                } else {
                  return res.send({
                    success: false,
                    message: 'Server Error'
                  });
                }
              } else {
                return res.send({
                  success: false,
                  message: 'Server Error'
                });
              }
            })
            .catch(err => {});
        }
      }
    );
  });
  //specific user buyOrders
  app.post('/api/account/getUserSpecificBuyOrders', (req, res, next) => {
    const { body } = req;
    const { token, email } = body;
    console.log(token);
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          UserInformation.find({ email })
            .then(succ => {
              if (succ && succ.length > 0) {
                let buyOrders = [];
                for (let i = 0; i < succ[0].buyOrders.length; i++) {
                  buyOrders.push(succ[0].buyOrders[i].orderID);
                }
                if (buyOrders.length > 0) {
                  Products.find({ orderID: { $in: buyOrders } })
                    .then(buyres => {
                      if (buyres && buyres.length > 0) {
                        let list1 = [];
                        for (let i in buyres) {
                          if (!buyres[i].executionStatus) {
                            console.log(buyres[i]);
                            list1.push(buyres[i]);
                            console.log('List is  ', list1);
                          }
                        }
                        return res.send({
                          message: 'Success',
                          success: true,
                          list: list1
                        });
                      }
                    })
                    .catch(err => {
                      return res.send({
                        message: 'Server Error',
                        success: false,
                        err
                      });
                    });
                } else {
                  return res.send({
                    success: false,
                    message: 'No Buy Order for this user'
                  });
                }
              } else {
                return res.send({
                  success: false,
                  message: 'No Buy Order for this user'
                });
              }
            })
            .catch(err => {});
        }
      }
    );
  });
  app.get('/api/account/executeAllOrders', (req, res, next) => {
    Products.find({})
      .then(products => {
        let pendingExectionOrders = [];
        if (products && products.length > 0) {
          for (let i in products) {
            if (
              products[i].maxPricedBid.length > 0 &&
              !products[i].executionStatus
            ) {
              pendingExectionOrders.push(products[i].orderID);
            }
          }
          if (pendingExectionOrders.length > 0) {
            Products.updateMany(
              { orderID: { $in: pendingExectionOrders } },
              { $set: { executionStatus: true } },
              { upsert: true }
            )
              .then(executedOrders => {
                return res.send({
                  success: true
                });
              })
              .catch(err => {});
          } else {
            return res.send({
              message: 'No products available for execution',
              success: false
            });
          }
        } else {
          return res.send({
            message: 'No products available',
            success: false
          });
        }
      })
      .then(err => {});
  });
  app.post('/api/account/getExecutedOrdersForAUser', (req, res, next) => {
    let { email, token } = req.body;
    UserSession.find(
      {
        _id: token,
        isDeleted: false
      },
      (err, session) => {
        if (err) {
          return res.send({
            success: false,
            message: 'Internal Server Error'
          });
        }
        if (session.length !== 1) {
          return res.send({
            success: false,
            message: 'Unauthorized'
          });
        } else {
          Products.find({})
            .then(products => {
              let executedBuy = [],
                unExecuted = [],
                executedSell = [];
              if (products && products.length > 0) {
                for (let i in products) {
                  if (
                    products[i].email === email &&
                    products[i].executionStatus
                  ) {
                    executedSell.push(products[i]);
                  } else if (
                    products[i].email !== email &&
                    products[i].executionStatus
                  ) {
                    if (products[i].maxPricedBid[0].email === email) {
                      executedBuy.push(products[i]);
                    }
                  } else if (products[i].email === email) {
                    unExecuted.push(products[i]);
                  }
                }
                return res.send({
                  executedBuy,
                  executedSell,
                  unExecuted
                });
              } else {
                return res.send({
                  success: false,
                  message: 'No products available'
                });
              }
            })
            .catch(err => {
              return res.send({
                message: 'Internal Server Error',
                success: false
              });
            });
        }
      }
    );
  });
  app.get('/api/account/getAllExecuted', (req, res, next) => {
    console.log('here');
    Products.find({})
      .then(products => {
        let executed = [],
          unExecuted = [];
        if (products && products.length > 0) {
          for (let i in products) {
            if (products[i].executionStatus) {
              executed.push(products[i]);
            } else if (
              products[i].maxPricedBid &&
              products[i].maxPricedBid.length > 0
            ) {
              unExecuted.push(products[i]);
            }
          }
          return res.send({
            success: true,
            exe: executed,
            unEx: unExecuted
          });
        } else {
          return res.send({
            success: false,
            message: 'No prods available'
          });
        }
      })
      .catch(err => {
        return res.send({
          success: false,
          message: 'Internal Server Error'
        });
      });
  });
};
