'use strict';

/* eslint-env node, mocha */

const config = require('test/properties');
const expect = require('chai').expect;
const fixtures = require('test/fixtures');
const mysqlx = require('index');

describe('@functional document collection modify', () => {
    let schema, session, collection;

    beforeEach('create default schema', () => {
        return fixtures.createDefaultSchema();
    });

    beforeEach('create session using default schema', () => {
        return mysqlx.getSession(config)
            .then(s => {
                session = s;
            });
    });

    beforeEach('load default schema', () => {
        schema = session.getSchema(config.schema);
    });

    beforeEach('create collection', () => {
        return schema.createCollection('test')
            .then(c => {
                collection = c;
            });
    });

    afterEach('drop default schema', () => {
        return session.dropSchema(config.schema);
    });

    afterEach('close session', () => {
        return session.close();
    });

    context('with truthy condition', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo' })
                .add({ _id: '2', name: 'bar' })
                .execute();
        });

        it('should update properties of all documents in a collection', () => {
            const expected = [{ _id: '1', name: 'qux' }, { _id: '2', name: 'qux' }];
            let actual = [];

            return collection
                .modify('true')
                .set('name', 'qux')
                .execute()
                .then(() => collection.find().execute(doc => actual.push(doc)))
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should remove properties of all documents in a collection', () => {
            const expected = [{ _id: '1' }, { _id: '2' }];
            let actual = [];

            return collection
                .modify('true')
                .unset('name')
                .execute()
                .then(() => collection.find().execute(doc => actual.push(doc)))
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });

    context('with filtering condition', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo' })
                .add({ _id: '2', name: 'bar' })
                .add({ _id: '3', name: 'baz' })
                .execute();
        });

        it('should update properties of the documents from a collection that match the criteria', () => {
            const expected = [{ _id: '1', name: 'foo' }, { _id: '2', name: 'qux' }, { _id: '3', name: 'baz' }];
            let actual = [];

            return collection
                .modify('name = "bar"')
                .set('name', 'qux')
                .execute()
                .then(() => collection.find().execute(doc => actual.push(doc)))
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should remove properties of the documents from a collection that match the criteria', () => {
            const expected = [{ _id: '1', name: 'foo' }, { _id: '2' }, { _id: '3', name: 'baz' }];
            let actual = [];

            return collection
                .modify('name = "bar"')
                .unset('name')
                .execute()
                .then(() => collection.find().execute(doc => actual.push(doc)))
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });

    context('with limit', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo' })
                .add({ _id: '2', name: 'bar' })
                .add({ _id: '3', name: 'baz' })
                .execute();
        });

        it('should modify a given number of documents', () => {
            const expected = [{ _id: '1', name: 'qux' }, { _id: '2', name: 'bar' }, { _id: '3', name: 'baz' }];
            let actual = [];

            return collection
                .modify('true')
                .set('name', 'qux')
                .limit(1)
                .execute()
                .then(() => collection.find().execute(doc => actual.push(doc)))
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });

    context('single document replacement', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo' })
                .add({ _id: '2', name: 'bar' })
                .add({ _id: '3', name: 'baz' })
                .execute();
        });

        it('should replace the entire document if it exists', () => {
            const expected = [{ _id: '1', age: 23 }, { _id: '2', name: 'bar' }, { _id: '3', name: 'baz' }];
            let actual = [];

            return collection
                .replaceOne('1', { _id: '3', age: 23 })
                .then(result => {
                    expect(result.getAffectedItemsCount()).to.equal(1);

                    return collection
                        .find()
                        .execute(doc => actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should do nothing if the document does not exist', () => {
            const expected = [{ _id: '1', name: 'foo' }, { _id: '2', name: 'bar' }, { _id: '3', name: 'baz' }];
            let actual = [];

            return collection
                .replaceOne('4', { _id: '1', name: 'baz', age: 23 })
                .then(result => {
                    expect(result.getAffectedItemsCount()).to.equal(0);

                    return collection
                        .find()
                        .execute(doc => actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });

    context('multi-option expressions', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo' })
                .add({ _id: '2', name: 'bar' })
                .add({ _id: '3', name: 'baz' })
                .execute();
        });

        it('should modify all documents that match a criteria specified by a grouped expression', () => {
            const expected = [{ _id: '1', name: 'qux' }, { _id: '2', name: 'bar' }, { _id: '3', name: 'qux' }];
            let actual = [];

            return collection
                .modify("_id in ('1', '3')")
                .set('name', 'qux')
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should modify all documents that do not match a criteria specified by a grouped expression', () => {
            const expected = [{ _id: '1', name: 'foo' }, { _id: '2', name: 'qux' }, { _id: '3', name: 'baz' }];
            let actual = [];

            return collection
                .modify("_id not in ('1', '3')")
                .set('name', 'qux')
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });

    context('patching objects', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo', age: 23, address: { city: 'bar', street: 'baz', zip: 'qux' } })
                .add({ _id: '2', name: 'bar', age: 42, address: { city: 'baz', street: 'qux', zip: 'quux' } })
                .add({ _id: '3', name: 'baz', age: 23, address: { city: 'qux', street: 'quux', zip: 'biz' } })
                .execute();
        });

        it('should update all matching documents of a collection', () => {
            const expected = [
                { _id: '1', name: 'qux', age: 23, address: { city: 'bar', street: 'baz', zip: 'qux' } },
                { _id: '2', name: 'bar', age: 42, address: { city: 'baz', street: 'qux', zip: 'quux' } },
                { _id: '3', name: 'qux', age: 23, address: { city: 'qux', street: 'quux', zip: 'biz' } }
            ];

            let actual = [];

            return collection
                .modify('age = 23')
                .patch({ name: 'qux' })
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should replace values of document fields at any nesting level', () => {
            const expected = [
                { _id: '1', name: 'qux', age: 23, address: { city: 'foo', street: 'bar', zip: 'qux' } },
                { _id: '2', name: 'bar', age: 42, address: { city: 'baz', street: 'qux', zip: 'quux' } },
                { _id: '3', name: 'baz', age: 23, address: { city: 'qux', street: 'quux', zip: 'biz' } }
            ];

            let actual = [];

            return collection
                .modify('_id = "1"')
                .patch({ name: 'qux', address: { city: 'foo', street: 'bar' } })
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should add new document fields at any nesting level', () => {
            const expected = [
                { _id: '1', name: 'foo', age: 23, more: true, address: { city: 'bar', street: 'baz', zip: 'qux', more: true } },
                { _id: '2', name: 'bar', age: 42, more: true, address: { city: 'baz', street: 'qux', zip: 'quux', more: true } },
                { _id: '3', name: 'baz', age: 23, more: true, address: { city: 'qux', street: 'quux', zip: 'biz', more: true } }
            ];

            let actual = [];

            return collection
                .modify('true')
                .patch({ more: true, address: { more: true } })
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should delete document fields at any nesting level', () => {
            const expected = [
                { _id: '1', name: 'foo', address: { city: 'bar', street: 'baz' } },
                { _id: '2', name: 'bar', age: 42, address: { city: 'baz', street: 'qux', zip: 'quux' } },
                { _id: '3', name: 'baz', address: { city: 'qux', street: 'quux' } }
            ];

            let actual = [];

            return collection
                .modify('age = 23')
                .patch({ age: null, address: { zip: null } })
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should avoid any change to the `_id` field', () => {
            const expected = [
                { _id: '1', name: 'qux', age: 23 },
                { _id: '2', name: 'bar', age: 42, address: { city: 'baz', street: 'qux', zip: 'quux' } },
                { _id: '3', name: 'baz', age: 23, address: { city: 'qux', street: 'quux', zip: 'biz' } }
            ];

            let actual = [];

            return collection
                .modify('_id = "1"')
                .patch({ _id: '4', name: 'qux', address: null })
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });

    context('update order', () => {
        beforeEach('add fixtures', () => {
            return collection
                .add({ _id: '1', name: 'foo', age: 23 })
                .add({ _id: '2', name: 'bar', age: 42 })
                .add({ _id: '3', name: 'baz', age: 23 })
                .execute();
        });

        it('should modify documents with a given order provided as an expression array', () => {
            const expected = [{ _id: '1', name: 'foo', age: 23 }, { _id: '2', name: 'bar', age: 42, updated: true }, { _id: '3', name: 'baz', age: 23 }];
            const actual = [];

            return collection
                .modify('true')
                .set('updated', true)
                .limit(1)
                .sort(['age DESC'])
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });

        it('should modify documents with a given order provided as multiple expressions', () => {
            const expected = [{ _id: '1', name: 'foo', age: 23 }, { _id: '2', name: 'bar', age: 42 }, { _id: '3', name: 'baz', age: 23, updated: true }];
            const actual = [];

            return collection
                .modify('true')
                .set('updated', true)
                .limit(1)
                .sort('age ASC', 'name ASC')
                .execute()
                .then(() => {
                    return collection
                        .find()
                        .execute(doc => doc && actual.push(doc));
                })
                .then(() => expect(actual).to.deep.equal(expected));
        });
    });
});
