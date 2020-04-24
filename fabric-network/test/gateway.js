/**
 * Copyright 2018, 2019 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint require-atomic-updates: off */

'use strict';
const sinon = require('sinon');
const rewire = require('rewire');

const {IdentityContext} = require('fabric-common');
const {X509Provider} = require('../lib/impl/wallet/x509identity');
const {newDefaultProviderRegistry} = require('../lib/impl/wallet/identityproviderregistry');

const chai = require('chai');
const should = chai.should();
chai.use(require('chai-as-promised'));

const Gateway = rewire('../lib/gateway');
const Client = rewire('fabric-common/lib/Client');
const QueryStrategies = require('../lib/impl/query/defaultqueryhandlerstrategies');

describe('Gateway', () => {
	let client;
	let identityContext;
	let revert;
	let clientHelper;

	let gateway;

	let wallet;
	let provider;
	let identity;
	let options;

	beforeEach(() => {
		revert = [];

		clientHelper = sinon.stub();
		clientHelper.loadFromConfig = sinon.stub().resolves('ccp');
		revert.push(Gateway.__set__('NetworkConfig', clientHelper));

		provider = sinon.createStubInstance(X509Provider);
		provider.getUserContext.callsFake((id, label) => {
			return {
				getName: () => label,
				getMspid: () => id.mspId
			};
		});

		const providerRegistry = newDefaultProviderRegistry();
		const getProviderStub = sinon.stub(providerRegistry, 'getProvider');
		getProviderStub.callThrough();
		getProviderStub.withArgs('X.509').returns(provider);
		revert.push(Gateway.__set__('newDefaultProviderRegistry', () => providerRegistry));

		client = sinon.createStubInstance(Client);
		client.type = 'Client';
		identityContext = sinon.createStubInstance(IdentityContext);
		client.newIdentityContext.returns(identityContext);

		gateway = new Gateway();
		gateway.getIdentity = sinon.fake.returns({
			mspId: 'mspId'
		});

		identity = {
			type: 'X.509',
			mspId: 'mspId',
			credentials: {
				certificate: 'certificate',
				privateKey: 'privateKey'
			}
		};

		wallet = {
			getProviderRegistry: () => providerRegistry
		};

		options = {
			wallet,
			identity: 'identity'
		};

		wallet.get = sinon.stub();
		wallet.get.resolves();
		wallet.get.withArgs(options.identity).resolves(identity);

	});

	afterEach(() => {
		revert.forEach((f) => f());
		sinon.restore();
	});

	describe('#_mergeOptions', () => {
		let defaultOptions;

		beforeEach(() => {
			defaultOptions = {
				top1: {
					inner11: 10,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
		});

		it('should return the default options when there are no overrides', () => {
			const overrideOptions = {};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(defaultOptions);
		});

		it('should change all top option', () => {
			const overrideOptions = {
				top1: {
					inner11: 20,
					inner12: 'twenty'
				},
			};
			const expectedOptions = {
				top1: {
					inner11: 20,
					inner12: 'twenty'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should change a one inner option', () => {
			const overrideOptions = {
				top1: {
					inner11: 20
				},
			};
			const expectedOptions = {
				top1: {
					inner11: 20,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should null out one inner option', () => {
			const overrideOptions = {
				top1: {
					inner11: null
				},
			};
			const expectedOptions = {
				top1: {
					inner11: null,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should null out one inner option using reference null', () => {
			const myNull = null;
			const overrideOptions = {
				top1: {
					inner11: myNull
				},
			};
			const expectedOptions = {
				top1: {
					inner11: null,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should add a non structure top option', () => {
			const overrideOptions = {
				single: true
			};
			const expectedOptions = {
				top1: {
					inner11: 10,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				},
				single: true
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should add a null non structure top option', () => {
			const overrideOptions = {
				single: null
			};
			const expectedOptions = {
				top1: {
					inner11: 10,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				},
				single: null
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should null a structure top option', () => {
			const overrideOptions = {
				top1: null
			};
			const expectedOptions = {
				top1: null,
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should add an option structure', () => {
			const overrideOptions = {
				top3: {
					inner31: 30,
					inner32: 'thirty'
				}
			};
			const expectedOptions = {
				top1: {
					inner11: 10,
					inner12: 'ten'
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				},
				top3: {
					inner31: 30,
					inner32: 'thirty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});

		it('should add inner-inner structure to top option', () => {
			const overrideOptions = {
				top1: {
					top13: {
						inner131: 131
					}
				}
			};
			const expectedOptions = {
				top1: {
					inner11: 10,
					inner12: 'ten',
					top13: {
						inner131: 131
					}
				},
				top2: {
					inner21: 20,
					inner22: 'twenty'
				}
			};
			Gateway._mergeOptions(defaultOptions, overrideOptions);
			defaultOptions.should.deep.equal(expectedOptions);
		});
	});

	describe('#constructor', () => {
		it('should instantiate a Gateway object', () => {
			const gy = new Gateway();
			gy.networks.should.be.instanceof(Map);
		});
	});

	describe('#connect', () => {
		it('should fail without options supplied', () => {
			return gateway.connect()
				.should.be.rejectedWith('An identity must be assigned to a Gateway instance');
		});

		it('should fail for identity string without wallet', () => {
			options = {
				identity: 'identity'
			};
			return gateway.connect('ccp', options)
				.should.be.rejectedWith('No wallet supplied from which to retrieve identity label');
		});

		it('should connect to the gateway with wallet identity', async () => {
			await gateway.connect('ccp', options);
			gateway.client.name.should.equal('gateway client');
			gateway.identityContext.mspid.should.equal(identity.mspId);
		});

		it('should connect to the gateway with an X.509 identity object', async () => {
			options = {
				identity
			};
			await gateway.connect('ccp', options);
			gateway.identityContext.mspid.should.equal(identity.mspId);
		});

		it('should fail for non-default identity object type without provider', () => {
			identity.type = 'UNKNOWN_TYPE';
			options = {
				identity
			};
			return gateway.connect('ccp', options)
				.should.be.rejectedWith(identity.type);
		});

		it('should connect to the gateway with non-default identity object type and provider', async () => {
			identity.type = 'UNKNOWN_TYPE';
			options = {
				identity,
				identityProvider: provider
			};
			await gateway.connect('ccp', options);
			gateway.identityContext.mspid.should.equal(identity.mspId);
		});

		it('should set client tls credentials', async () => {
			options.clientTlsIdentity = 'tls';
			wallet.get.withArgs(options.clientTlsIdentity).resolves(identity);

			await gateway.connect(client, options);
			sinon.assert.calledOnceWithExactly(client.setTlsClientCertAndKey,
				identity.credentials.certificate, identity.credentials.privateKey);
		});

		it('should connect to the gateway with identity and set client tls crypto material using tlsInfo', async () => {
			options.tlsInfo = {
				certificate: 'acert',
				key: 'akey'
			};
			await gateway.connect(client, options);
			sinon.assert.calledOnceWithExactly(client.setTlsClientCertAndKey, 'acert', 'akey');
		});

		it('should connect from an existing client object', async () => {
			await gateway.connect(client, options);
			gateway.client.should.equal(client);
		});

		it('has default transaction event handling strategy if none specified', async () => {
			await gateway.connect('ccp', options);
			gateway.getOptions().eventHandlerOptions.strategy.should.be.a('Function');
		});

		it('allows transaction event handling strategy to be specified', async () => {
			const stubStrategyFn = function stubStrategyFn() { };
			options.eventHandlerOptions = {
				strategy: stubStrategyFn
			};
			await gateway.connect('ccp', options);
			gateway.getOptions().eventHandlerOptions.strategy.should.equal(stubStrategyFn);
		});

		it('allows null transaction event handling strategy to be set', async () => {
			options.eventHandlerOptions = {
				strategy: null
			};
			await gateway.connect('ccp', options);
			should.equal(gateway.getOptions().eventHandlerOptions.strategy, null);
		});

		it('should assign connection options to the client', async () => {
			options['connection-options'] = {
				option1: 'option1',
				option2: 'option2'
			};
			await gateway.connect(client, options);
			client.centralized_options.option1.should.equal('option1');
		});
		it('throws if the identity does not exist', () => {
			options = {
				wallet,
				identity: 'INVALID_IDENTITY_LABEL'
			};
			return gateway.connect('ccp', options)
				.should.be.rejectedWith('Identity not found in wallet: INVALID_IDENTITY_LABEL');
		});

		it('throws if the TLS identity does not exist', () => {
			options.clientTlsIdentity = 'INVALID_IDENTITY_LABEL';
			return gateway.connect('ccp', options)
				.should.be.rejectedWith('Identity not found in wallet: INVALID_IDENTITY_LABEL');
		});
	});

	describe('getters', () => {
		beforeEach(async () => {
			await gateway.connect(client, options);
		});

		describe('#getOptions', () => {
			it('should return the options', () => {
				gateway.getOptions().should.be.an('object').that.nested.include({
					'queryHandlerOptions.timeout': 30,
					'queryHandlerOptions.strategy': QueryStrategies.MSPID_SCOPE_SINGLE,
					'eventHandlerOptions.commitTimeout': 300
				});
			});
		});
	});


	describe('#getNetwork/#disconnect', () => {
		beforeEach(async () => {
			options.discovery = {
				enabled: false
			};
			options.query = {
				strategy: () => {}
			};
			await gateway.connect('ccp', options);
			gateway.identityContext = identityContext;
		});

		it('should get a new network with new name', async () => {
			const network1 = await gateway.getNetwork('network1');
			const network2 = await gateway.getNetwork('network2');
			gateway.networks.size.should.equal(2);
			network1.should.not.equal(network2);
		});

		it('should return a cached network object', async () => {
			const network1 = await gateway.getNetwork('network1');
			const network2 = await gateway.getNetwork('network1');
			network1.should.equal(network2);
		});

		it('should cleanup the gateway and its networks', async () => {
			await gateway.getNetwork('network1');
			gateway.networks.size.should.equal(1);
			gateway.disconnect();
			gateway.networks.size.should.equal(0);
		});
	});
});
