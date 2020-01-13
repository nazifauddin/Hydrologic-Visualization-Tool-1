//===========================================================
// index.js - main javascript for index map
//===========================================================
/* globals main, L, util, data */ // for jshint

// create module object
if(!window.main) window.main = {};


//-----------------------------------------------------------
// init
//   startup
main.init = function () {
    const funcName = "main [init]:";
    console.log(funcName);

    // create map
    main.map = new L.Map("map", Object.assign(util.mapOpts, {
        maxZoom: 15,
        zoomSnap: 0.1,
        zoomerControl: {
            buttons: ["in", "home", "out"],
            zoomHomeTarget: () => main.map.fitBounds(data.mask, {
                padding: [10, 10]
            })
        },
        layerpickerControl: {
            basemaps: [{
                    layer: "stamen_terrain2"
                }, {
                    layer: "esri_topo"
                }, {
                    layer: "esri_imagery2"
                }, {
                    layer: "esri_natgeo"
                }, {
                    layer: "openstreets_hot"
                }, {
                    layer: "carto_positron2"
                }
            ],
            overlays: [{
                    layer: "nationalmap_nhd",
                    show: true
                }, {
                    layer: "nwismapper_hucs_ref" // !!! NO HUCS IN CANADA
                }
            ],
            buttonClass: "btn-light",
            className: "d-none d-md-block"
        },
        coordinatesControl: {
            className: "d-none d-md-block"
        },
        scalebarControl: {
            className: "d-none d-md-block"
        },
        insetmapControl: {
            className: "d-none d-md-block"
        },
        centerpanelControl: {
            topBottom: "top",
            className: "d-none d-md-inline-block bg-dark text-light border-0 rounded-0 shadow-lg px-3 py-2",
            contentHtml: /*html*/ `
                <div class="d-flex align-items-center">
                    <table>
                        <tr>
                            <td class="text-right"><div class="awesome-marker awesome-marker-icon-red  position-relative" style="transform: scale(.5); margin:-10px -5px;"></div></td>  <td class="text-left">STREAM</td>
                            <td class="text-right"><div class="awesome-marker awesome-marker-icon-blue position-relative" style="transform: scale(.5); margin:-10px -5px;"></div></td>  <td class="text-left">LAKE  </td>
                        </tr>
                        <tr>
                            <td class="text-info" colspan="4"> <i class="fas fa-info-circle"></i> Click a marker to view data </td>
                        </tr>
                    </table>
                    <div>
                        <button type="button" class="btn btn-sm btn-outline-info ml-3" onclick="main.listView()">
                            <i class="fas fa-list"></i> List View
                        </button>
                    </div>
                </div>`
        }
    })).fitBounds(data.mask, {
        padding: [10, 10]
    });

    // add mask
    L.polygon([
        [[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]], // entire world
        data.mask // hole
    ], {
        weight: 2,
        color: "#777",
        dashArray: "4,4",
        fillColor: "black",
        fillOpacity: 0.2,
        interactive: false
    }).addTo(main.map);

    // // add river
    // L.geoJSON(data.river, {
    //     style: () => {
    //         return {
    //             color: "#09c",
    //             weight: 5,
    //             opacity: 0.6,
    //             interactive: false
    //         };
    //     }
    // }).addTo(main.map);

    // add sites
    L.geoJSON(data.sites, {
        pointToLayer: (point, latlng) => {
            return L.marker(latlng, {
                riseOnHover: true,
                icon: L.AwesomeMarkers.icon({
                    markerColor: point.properties.SiteType === "ST" ? "red" : "blue",
                    prefix: "fa",
                    icon: "dot-circle"
                })
            }).bindTooltip( /*html*/ `
                <div class="text-uppercase"> ${point.properties.SiteName}                          </div>
                <div class="text-info"     > <i class="fas fa-info-circle"></i> Click to view data </div>
            `, {
                className: "text-center bg-dark text-light border-0 rounded-0 shadow-lg px-3 py-2",
                opacity: 1
            }).on("click", () => main.popupSite(point.properties.Id));
        }
    }).addTo(main.map);

}; // init


//-----------------------------------------------------------
// listView
//   show dialog to select a site from a list
main.listView = () => {
    const funcName = "main [listView]:";
    console.log(funcName);

    // build table
    let html = $( /*html*/ `
        <div>
            <table class="table table-hover table-sm small">
                <thead>
                    <th> ID   </th>
                    <th> NAME </th>
                    <th> TYPE </th>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `);
    data.sites.features.forEach(feature => {
        $(html).find("tbody").append( /*html*/ `
            <tr data-id="${feature.properties.Id}" style="cursor:pointer;">
                <td> ${feature.properties.SiteNumber || '--'} </td>
                <td> ${feature.properties.SiteName} </td>
                <td> ${feature.properties.SiteType==='ST' ? 'Stream' : 'Lake' } </td>
            </tr>
        `);
    });

    // show dialog
    util.alert(html.html(), {
        maxWidth: 600,
        title: "Select Site",
        footer: /*html*/ `
            <span class="float-left small text-muted">
                <i class="fas fa-info-circle"></i> Click a table row to view data for a site
            </span>`
    });

    // clicking row pops up site page and closes dialog
    $("#util_ui_alert tbody tr").click(function () {
        const id = $(this).data("id");
        main.popupSite(id);
        util.alert(false);
    });

}; // listView


//-----------------------------------------------------------
// popupSite
//   popup new browser window with site page for site with specified id
main.popupSite = (id) => {
    const funcName = "main [popupSite]:";
    console.log(`${funcName} ${id}`);

    util.popupWindow(`./site.html?Id=${id}`, {
        width: 0.9 * window.screen.width,
        height: Math.min(0.9 * window.screen.height, 500),
        left: 10,
        top: 10
    });

}; // popupSite
