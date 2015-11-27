'use strict';

var _ = require('underscore');
var async = require('async');
var EventEmitter = require('events');
var request = require('request');

module.exports = {

	homeUrl: 'https://kingproxies.com/',

	getProxies: function(options) {

		options || (options = {});

		var emitter = new EventEmitter();

		var fn = async.seq(
			this.getData,
			this.parseResponseData
		);

		fn(options, function(error, proxies) {

			if (error) {
				emitter.emit('error', error);
			} else {
				emitter.emit('data', proxies);
			}

			emitter.emit('end');
		});

		return emitter;
	},

	getData: function(options, cb) {

		if (process.env.PROXY_LISTS_KINGPROXIES_API_KEY) {
			options.kingproxies || (options.kingproxies = {});
			options.kingproxies.apiKey = process.env.PROXY_LISTS_KINGPROXIES_API_KEY;
		}

		if (!options.kingproxies || !options.kingproxies.apiKey) {
			return cb(new Error('Missing API key for kingproxies. Provide API key via `options.kingproxies.apiKey`.'));
		}

		var requestOptions = {
			method: 'GET',
			url: 'https://kingproxies.com/api/v2/proxies.json',
			qs: {
				key: options.kingproxies.apiKey,
				type: options.anonymityLevels.join(','),
				protocols: options.protocols.join(','),
				alive: 'true',
				country_code: _.keys(options.countries).join(',').toUpperCase(),
			}
		};

		if (options.sample) {
			requestOptions.qs.new = 'true';
		}

		request(requestOptions, function(error, response, data) {

			if (error) {
				return cb(error);
			}

			cb(null, data);
		});
	},

	parseResponseData: function(data, cb) {

		try {

			data = JSON.parse(data);

			if (data.message) {
				throw new Error(data.message);
			}

			var proxies = _.map(data.data.proxies, function(proxy) {

				return {
					ipAddress: proxy.ip,
					port: parseInt(proxy.port),
					protocols: proxy.protocols,
					anonymityLevel: proxy.type.toLowerCase(),
					country: proxy.country_code.toLowerCase()
				};
			});

		} catch (error) {
			return cb(error);
		}

		cb(null, proxies);
	}
};