/**
 * Created by winni on 10/25/17.
 */

let svgWidth = $(window).width() - 20
let svgHeight = $(window).height() - 20

let width = svgWidth
let height = svgHeight

var node_height = 60

var svgViewport = d3.select("body")
    .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .style("background", "none")
//.style('stroke', 'black')


// svgViewport.append("rect")
//     .attr("width", svgWidth)
//     .attr("height", svgHeight)
//     .style("fill", "none")
//     .style("pointer-events", "all")
//     .call(d3.zoom()
//         .scaleExtent([1 / 8, 4])
//         .on("zoom", zoomed))

// var svg = svgViewport.append('g')
var svg = svgViewport

var color = d3.scaleOrdinal(d3.schemeCategory20);


var d3cola = cola.d3adaptor(d3)
    .avoidOverlaps(true)
    .size([width, height])


// var simulation = d3.forceSimulation()
//     .force("link", d3.forceLink().id(d => d.id))
//     .force('repel_end_nodes', d3.forceLink().id(d => d.id))
//     //.force("charge", d3.forceManyBody().strength(-0.1))
//     .force("center", d3.forceCenter(width / 2, height / 2))
//     .force('collision', d3.forceCollide().radius(get_node_radius())
//     .force('vertical', d3.forceX(svgWidth))
//.force('circular', d3.forceRadial(height * 3, width / 2, height / 2).strength(0.3))

d3.json('graph.json', graph => {
    var nodeRadius = 5

    graph.nodes.forEach(v => {
        v.height = v.width = 2 * nodeRadius
    })

    console.log(graph.nodes)
    d3cola
        .nodes(graph.nodes)
        .links(graph.edges)
        .flowLayout("y", 30)
        .symmetricDiffLinkLengths(6)
        .start(10, 20, 20)

    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000')

    var path = svg.selectAll(".link")
        .data(graph.links)
        .enter().append('svg:path')
        .attr('class', 'link')

    var node = svg.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", nodeRadius)
        .style("fill", function (d) {
            return color(d.group)
        })
        .call(d3cola.drag)

    node.append("title")
        .text(function (d) {
            return d.name
        })

    d3cola.on("tick", function () {
        // draw directed edges with proper padding from node centers
        path.attr('d', function (d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = nodeRadius,
                targetPadding = nodeRadius + 2,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY)
            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY
        })

        node.attr("cx", function (d) {
            return d.x
        })
            .attr("cy", function (d) {
                return d.y
            })
    })

})

function unused(graph) {
    d3cola
        .nodes(graph.nodes)
        .links(graph.edges)
        .linkDistance(100)
        //.avoidOverlaps(true)
        .start(30)

    console.log('past start')
    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.edges)
        .enter()
        .append("line")
        .attrs({
            stroke: 'blue',
            opacity: 0.5,
            'stroke-width': 2
        })

    let node_padding = 2

    let nodes = {}
    for (let n of graph.nodes) {
        nodes[n.id] = n
    }

    var node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(graph.nodes)
        .enter()
        .append('g')
        .attrs({
            id: n => n.id,
            width: n => get_node_width(n) + 2 * node_padding,
            height: get_node_height,
            'class': 'node'
        })


    //node.call(d3cola.drag)
    node
        .append('rect')
        .attrs({
            width: d => get_node_width(d) + 2 * node_padding,
            height: d => get_node_height(d) + 2 * node_padding,
            'fill': d => get_node_color(d),
            'fill-opacity': 0.3,
            stroke: d => get_node_color(d),
            'stroke-width': 5,
        })
        .on('click', bind_node_vis)

    node
        .append('text')
        .text(n => n.repr)
        .attrs({
            y: 20,
            x: node_padding,
            textLength: n => get_node_width(n),
        })


    // simulation.force('repel_end_nodes')
    //     .links([{
    //         source: min_node_id,
    //         target: max_node_id,
    //     }])
    //     .distance(total_node_radius/2)

    d3cola.on('tick', tock)
    function tock() {
        console.log('tock')
        link.attrs({
            x1: d => d.source.x,
            y1: d => d.source.y,
            x2: d => d.target.x,
            y2: d => d.target.y,
        })

        node.attr("transform", n => `translate(${n.x},${n.y})`)
    }

    function bind_node_vis(node_id) {
        node_id = node_id.id
        let node_data = nodes[node_id]

        let width = get_node_width(node_data)

        let chart = bb.generate({
            data: {
                type: "line",
                columns: [
                    ['Coverage'].concat(node_data.coverage)
                ],
            },
            axis: {
                x: {
                    type: 'category',
                    tick: {
                        outer: false,
                        centered: true
                    },
                    categories: node_data.repr.split(''),
                },
                y: {show: false},
            },
            legend: {show: false},
            bindto: this.parentNode,
        }).resize({width: width, height: node_height})
    }
}

function dragstarted(d) {
    console.log(d3.event.target)
    if (!d3.event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
}

function dragged(d) {
    d.fx = d3.event.x
    d.fy = d3.event.y
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
}

function zoomed() {
    // console.log(d3.event)
    svg.attr("transform", d3.event.transform)
}


function get_node_height(node_data) {
    return node_height
}

function get_node_width(node_data) {
    return Math.max(12, node_data.repr.length * 8)
}

function get_node_color(node_data) {
    return node_data.is_missing ? 'grey' : 'blue'
}

function get_node_radius(node_data) {
    return Math.sqrt(get_node_height(node_data) ** 2 + get_node_width(node_data) ** 2) / 2
}
