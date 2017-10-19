const BaseController = require('./shared/basecontroller');
const modelFactory = require('./shared/modelFactory');
const parser = require('../helpers/url_parser');

const apiRoot = 'https://localhost/api';
const model = modelFactory.getModel('schemaless');

const transform = function transformFun(obj, urlRoot) {
    obj = { ...obj.toObject().stix, ...obj.toObject().metaProperties, ...obj.toObject };
    const apiObj = {
        type: obj.type,
        id: obj.id,
        attributes: obj,
        links: {
            self: `${urlRoot}/${obj._id}`
        }
    };
    // delete apiObj.attributes._id;
    // delete apiObj.attributes.__v;
    return apiObj;
};

const get = (req, res) => {
    res.header('Content-Type', 'application/vnd.api+json');

    const query = parser.dbQueryParams(req);
    if (query.error) {
        return res.status(400).json({ errors: [{ status: 400, source: '', title: 'Error', code: '', detail: query.error }] });
    }

    model
        .find(query.filter)
        .sort(query.sort)
        .limit(query.limit)
        .skip(query.skip)
        .exec((err, result) => {

            if (err) {
                return res.status(500).json({ errors: [{ status: 500, source: '', title: 'Error', code: '', detail: 'An unknown error has occurred.' }] });
            }

            const requestedUrl = apiRoot + req.originalUrl;
            const convertedResult = result.map(res => transform(res, requestedUrl));
            return res.status(200).json({ links: { self: requestedUrl, }, data: convertedResult });
        });
};

const addComment = (req, res) => {
    res.header('Content-Type', 'application/vnd.api+json');

    // get the old item
    if (req.swagger.params.id.value !== undefined 
        && req.swagger.params.data !== undefined 
        && req.swagger.params.data.value.data.attributes !== undefined
        && req.swagger.params.data.value.data.attributes.comment !== undefined) {

        const id = req.swagger.params.id ? req.swagger.params.id.value : '';
        const user = req.user;
        const comment = req.swagger.params.data.value.data.attributes.comment;

        model.findById({ _id: id }, (err, result) => {
            if (err) {
                return res.status(500).json({ errors: [{ status: 500, source: '', title: 'Error', code: '', detail: 'An unknown error has occurred.' }] });
            }
            const resultObj = result.toObject();
            if (resultObj.metaProperties === undefined) {
                resultObj.metaProperties = {};
            }

            if (resultObj.metaProperties.comments === undefined) {
                resultObj.metaProperties.comments = [];
            } 

            resultObj.metaProperties.comments.push({
                "user": {
                    "id": user._id, 
                    "userName": user.userName,
                    "avatar_url": user.github.avatar_url
                },
                "submitted": new Date(),
                "comment": comment
            });

            const newDocument = new model(resultObj);
            const error = newDocument.validateSync();
            if (error) {
                const errors = [];
                lodash.forEach(error.errors, (field) => {
                    errors.push(field.message);
                });
                return res.status(400).json({ errors: [{ status: 400, source: '', title: 'Error', code: '', detail: errors }] });
            }

            // guard pass complete
            model.findOneAndUpdate({ _id: id }, newDocument, { new: true }, (errUpdate, resultUpdate) => {
                if (errUpdate) {
                    return res.status(500).json({ errors: [{ status: 500, source: '', title: 'Error', code: '', detail: 'An unknown error has occurred.' }] });
                }

                if (resultUpdate) {
                    const requestedUrl = apiRoot + req.originalUrl;
                    return res.status(200).json({
                        links: { self: requestedUrl, },
                        data: { attributes: newDocument.toObject() }
                    });
                }

                return res.status(404).json({ message: `Unable to update the item.  No item found with id ${id}` });
            });
           
        });
    } else {
        return res.status(400).json({ errors: [{ status: 400, source: '', title: 'Error', code: '', detail: 'malformed request' }] });
    }
};

module.exports = {
    get,
    addComment    
};
