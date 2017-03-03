'use strict';

module.exports = function (client) {

    var NS = {
        MUCLIGHT: {
            C: 'urn:xmpp:muclight:0#create',
            A: 'urn:xmpp:muclight:0#affiliations',
            CONF: 'urn:xmpp:muclight:0#configuration',
            D: 'urn:xmpp:muclight:0#destroy',
        }
    };

    client.disco.addFeature('urn:xmpp:muclight:0');

    var stanzas = client.stanzas;
    var types = stanzas.utils;
    var Utils = types;


    var Destroy = stanzas.define({
        name: 'muclightD',
        element: 'query',
        namespace: NS.MUCLIGHT.D
    });

    var Create = stanzas.define({
        name: 'muclightCreate',
        element: 'query',
        namespace: NS.MUCLIGHT.C,
        fields: {
            roomname: {
                get: function() {
                    var conf = this.xml.getChildrenByFilter(function(c) {return c.name === 'configuration';})[0];
                    if (conf) {
                        var roomname = conf.getChildrenByFilter(function(c) {return c.name === 'roomname';})[0];
                        if (roomname) {
                            return roomname.getText();
                        }
                    }

                    return {};
                },
                set: function(opts) {
                    if (opts) {
                        var el = Utils.createElement('', 'configuration');
                        var ch = Utils.createElement('', 'roomname');
                        ch.textContent = opts;
                        el.appendChild(ch);
                        this.xml.appendChild(el);
                    }
                }
            },
        }
    });

    var Conf = stanzas.define({
        name: 'muclightConf',
        element: 'query',
        namespace: NS.MUCLIGHT.CONF,
        fields: {
            roomname: {
                get: function() {
                    var roomname = this.xml.getChildrenByFilter(function(c) {return c.name === 'roomname';})[0];
                    if (roomname) {
                        return roomname.getText();
                    }

                    return {};
                },
                set: function (opts) {
                    if (opts) {
                        var ch = Utils.createElement('', 'roomname');
                        ch.textContent = opts;
                        this.xml.appendChild(ch);
                    }
                }
            }
        }
    });

    var Affil = stanzas.define({
        name: 'muclightA',
        element: 'query',
        namespace: NS.MUCLIGHT.A,
        fields: {
            affiliates: {
                get: function() {
                    var invitees = Utils.find(this.xml, NS.MUCLIGHT.A, 'user');

                    if (!invitees.length) {
                        return {};
                    }

                    return invitees.map(function(invitee) {return invitee.children[0];});
                },
                set: function (opts) {
                    if (opts) {
                        opts.forEach(function(invitee) {
                            var el = Utils.createElement('', 'user');
                            this.xml.appendChild(el);
                            el.setAttribute('affiliation', invitee.affiliation);
                            el.textContent = invitee.jid;
                        });

                    }
                }
            }
        }
    });

    stanzas.withIQ(function (IQ) {
        stanzas.extend(IQ, Create);
        stanzas.extend(IQ, Conf);
        stanzas.extend(IQ, Affil);
        stanzas.extend(IQ, Destroy);
    });

    client.muclight = {
        createRoom: function (jid, roomname, cb) {
            client.sendIq({
                type: 'set',
                to: jid, // input service JID for unique room JID
                muclightCreate: {
                    roomname: roomname
                }
            }, cb);
        },
        invite: function (room, jids, cb) {
            var affils = jids.map(function(jid) { return {affiliation: 'member', jid: jid}; });

            client.sendIq({
                type: 'set',
                to: room,
                muclightA: {
                    affiliates: affils
                }
            }, cb);
        },
        leaveRoom: function (jid, cb) {
            var affils = [{
                jid: client.jid.bare,
                affiliation: 'none'
            }];

            client.sendIq({
                type: 'set',
                to: jid,
                muclightA: {
                    affiliates: affils
                }
            }, cb);
        },
        destroyRoom: function (jid, cb) {
            client.sendIq({
                type: 'set',
                to: jid,
                muclightD: true
            }, cb);
        },
        kick: function(roomJid, jids, cb) {
            var affils = jids.map(function(jid) { return {affiliation: 'none', jid: jid}; });

            client.sendIq({
                type: 'set',
                to: roomJid,
                muclightA: {
                    affiliates: affils
                }
            }, cb);
        },
        getRoomConfig: function(jid, cb) {
            client.sendIq({
                type: 'get',
                to: jid,
                muclightConf: true
            }, cb);
        },
        setRoomConfig: function(jid, roomname, cb) {
            client.sendIq({
                type: 'set',
                to: jid,
                muclightConf: {
                    roomname: roomname
                }
            }, cb);
        },
        getRoomMembers: function(jid, cb) {
            client.sendIq({
                type: 'get',
                to: jid,
                muclightA: true
            }, cb);
        }
    };
};