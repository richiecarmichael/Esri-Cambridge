/* ------------------------------------------------------------

   Copyright 2016 Esri

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at:
   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

--------------------------------------------------------------- */

require({}, [
    'esri/WebScene',
    'esri/Graphic',
    'esri/geometry/ScreenPoint',
    'esri/PopupTemplate',
    'esri/tasks/QueryTask',
    'esri/tasks/support/Query',
    'esri/views/SceneView',
    'esri/layers/GraphicsLayer',
    'esri/symbols/MeshSymbol3D',
    'esri/symbols/FillSymbol3DLayer',
    'esri/renderers/SimpleRenderer',
    'esri/renderers/UniqueValueRenderer',
    'dojo/dom',
    'dojo/query',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/throttle',
    'dojo/domReady!'
],
function (
    WebScene,
    Graphic,
    ScreenPoint,
    PopupTemplate,
    QueryTask,
    Query,
    SceneView,
    GraphicsLayer,
    MeshSymbol3D,
    FillSymbol3DLayer,
    SimpleRenderer,
    UniqueValueRenderer,
    dom,
    query,
    on,
    domConstruct,
    throttle
    ) {
    // Hardcoded values used in this sample
    var WEBSCENE = '9c583c1d492f448b9302930f4b351834';
    var BUILDING_LAYER = 'CMBG 3D Buildings - CMBG 3D Buildings';
    var BUILDING_URL = 'https://gd3d.esri.com/server/rest/services/Hosted/CMBG_3D_Buildings/FeatureServer/0';
    var ADDRESS_URL = 'https://nyc3d-ags-ms.esri.com/arcgis/rest/services/Hosted/lod_1_buildings/FeatureServer/1';

    // Enforce strict mode
    'use strict';

    // Create webscene
    var _scene = new WebScene({
        portalItem: {
            id: WEBSCENE
        }
    });

    // Load web scene
    var _view = new SceneView({
        container: 'map',
        map: _scene
    });

    _view.on('click', function (e) {
        _view.hitTest(e.screenPoint).then(function (response) {
            // When the map is clicked perform a 3d hittest.
            var result = response.results[0];
            if (result &&
                result.graphic &&
                result.graphic.layer.title === BUILDING_LAYER) {
                return result.graphic;
            }
        }).then(function (f) {
            // A building is found in the 3d hittest.
            if (!f) { return; }

            // Get the object id of the picked building.
            var id = f.attributes[f.layer.objectIdField];

            // Re-initialize the popuptemplate for the layer.
            f.layer.popupTemplate = new PopupTemplate({});

            // Find the "building-id" by querying the paired feature service.
            var query1 = new Query({
                objectIds: [id],
                returnGeometry: false,
                outFields: ['bldgid']
            });
            var queryTask1 = new QueryTask({
                url: BUILDING_URL
            });
            queryTask1.execute(query1).then(function (results) {
                // Using the retrieved "building-id", get related addresses.
                if (!results || results.features.length === 0) { return;}
                var bid = results.features[0].attributes['bldgid'];
                var query2 = new Query({
                    where: "bldgid='" + bid + "'",
                    returnGeometry: false,
                    outFields: [
                        'full_address',
                        'addr_url'
                    ]
                });
                var queryTask2 = new QueryTask({
                    url: ADDRESS_URL
                });
                queryTask2.execute(query2).then(function (results2) {
                    // Construct single node to host all content.
                    var n = domConstruct.create('div');
                    results2.features.forEach(function (g) {
                        // Get address and url from graphic(s)
                        var str = g.attributes['full_address'];
                        var url = g.attributes['addr_url'];

                        // Create and append hyperlink.
                        var c = domConstruct.create('a', { href: '#', innerHTML: str, style: { display: 'block' } }, n);

                        // When the hyperlink is clicked add an iframe with address information.
                        on(c, 'click', function () {
                            // Delete previous iframe element (if any)
                            query(".rc-browser").forEach(domConstruct.destroy);

                            // Add new iframe.
                            domConstruct.create('iframe', {
                                class: 'rc-browser',
                                src: url,
                                width: '400',
                                height: '500',
                                style: {
                                    'overflow-x': 'hidden'
                                }
                            }, n, 'last');
                        });
                    });

                    // Open popup
                    _view.popup.open({
                        title: 'Cambridge Street Addresses',
                        location: e.mapPoint,
                        content: n
                    });
                });
            });
        });
    });

    // -------------------------------------------------------------------
    // Simulating mouse-over highlighting using a graphicslayer overlay.
    // BUG/DESIGN: Hittest on the SceneLayer returns a graphic void of geometry.
    // -------------------------------------------------------------------
    //_scene.then(function () {
    //    var highlight = new GraphicsLayer({
    //        id: 'highlight',
    //        renderer: new SimpleRenderer({
    //            symbol: new MeshSymbol3D({
    //                symbolLayers: [
    //                   new FillSymbol3DLayer({
    //                       material: {
    //                           color: 'cyan'
    //                       }
    //                   })
    //                ]
    //            })
    //        })
    //    });
    //    _view.map.add(highlight);
    //
    //    //
    //    on(dom.byId('map'), 'mousemove', throttle(function (e) {
    //        var sp = new ScreenPoint({
    //            x: e.offsetX,
    //            y: e.offsetY
    //        });
    //
    //        var selected = null;
    //
    //        // Perform hit tests on the 3d scene whenever the mouse moves.
    //        _view.hitTest(sp).then(function (response) {
    //            var result = response.results[0];
    //
    //            // If nothing found, reset the renderer to all white
    //            if (!result || !result.graphic || result.graphic.layer.title !== BUILDING_LAYER) {
    //                if (selected !== null) {
    //                    highlight.removeAll();
    //                    selected = null;
    //                }
    //                return;
    //            }
    //
    //            // If the currently selected graphic is found. Exit without doing anything.
    //            if (selected && selected === result.graphic) {
    //                return;
    //            }
    //
    //            // Keep a reference of the newly selected graphic. Get objectid.
    //            selected = result.graphic;
    //            var clone = result.graphic.clone();
    //            //
    //            highlight.removeAll();
    //            highlight.add(clone);
    //        });
    //    }, 50));
    //});

    // -------------------------------------------------------------------
    // Simulating mouse-over highlighting using a Unique Value Renderer
    // on the SceneLayer.
    // BUG: UniqueValueRenderer not fully supported on SceneLayers.
    // -------------------------------------------------------------------
    //_scene.then(function () {
    //    var selected = null;
    //    // Listen to the map's mouse-over event with a 50ms throttle
    //    on(dom.byId('map'), 'mousemove', throttle(function (e) {
    //        var sp = new ScreenPoint({
    //            x: e.offsetX,
    //            y: e.offsetY
    //        });
    //        // Perform hit tests on the 3d scene whenever the mouse moves.
    //        _view.hitTest(sp).then(function (response) {
    //            var result = response.results[0];
    //
    //            // If nothing found, reset the renderer to all white
    //            if (!result || !result.graphic || result.graphic.layer.title !== BUILDING_LAYER) {
    //                if (selected !== null) {
    //                    selected.layer.renderer = new SimpleRenderer({
    //                        symbol: new MeshSymbol3D({
    //                            symbolLayers: [
    //                               new FillSymbol3DLayer({
    //                                   material: {
    //                                       color: 'white'
    //                                   }
    //                               })
    //                            ]
    //                        })
    //                    });
    //                    selected = null;
    //                }
    //                return;
    //            }
    //
    //            // If the currently selected graphic is found. Exit without doing anything.
    //            if (selected && selected === result.graphic) {
    //                return;
    //            }
    //
    //            // Keep a reference of the newly selected graphic. Get objectid.
    //            selected = result.graphic;
    //            var id = selected.attributes[selected.layer.objectIdField];
    //            
    //            // Assign a unique value renderer that highlights the one and only "selected" graphic.
    //            selected.layer.renderer = new UniqueValueRenderer({
    //                field: selected.layer.objectIdField,
    //                defaultSymbol: new MeshSymbol3D({
    //                    symbolLayers: [
    //                        new FillSymbol3DLayer({
    //                            material: {
    //                                color: 'white'
    //                            }
    //                        })
    //                    ]
    //                }),
    //                uniqueValueInfos: [{
    //                    // Here is the objectid of the "highlighted" building.
    //                    value: id,
    //                    symbol: new MeshSymbol3D({
    //                        symbolLayers: [
    //                            new FillSymbol3DLayer({
    //                                material: {
    //                                    color: 'cyan'
    //                                }
    //                            })
    //                        ]
    //                    })
    //                }]
    //            });
    //        });
    //    }, 50));
    //});
});
