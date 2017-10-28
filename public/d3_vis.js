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
    .style('stroke', 'black')


svgViewport.append("rect")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .call(d3.zoom()
        .scaleExtent([1 / 4, 4])
        .on("zoom", zoomed))

var svg = svgViewport.append('g')


var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id))
    //.force("charge", d3.forceManyBody().strength(-2))
    //.force("center", d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(n => 200))
    .force('circular', d3.forceRadial(height * 3, width / 2, height / 2).strength(0.9))

d3.json("graph.json", graph => {
    if (!( 'links' in graph)) {
        graph.links = graph.edges
    }
    let node_padding = 2

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attrs({
            stroke: 'blue',
            opacity: 0.5,
            'stroke-width': 2
        })

    let nodes = {}
    for (let n of graph.nodes) {
        nodes[n.id] = n
    }

    let node_container = svg.append('g')
        .attr('class', 'nodes')
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

    var node = node_container
        .selectAll('.node')
        .data(graph.nodes)
        .enter()
        .append('g')
        .attrs({
            id: n => n.id,
            width: n => node_width(n) + 2 * node_padding,
            height: get_node_height,
        })

    node
        .append('text')
        .text(n => n.repr)
        .attrs({
            y: 20,
            x: node_padding,
            textLength: n => node_width(n),
        })

    node
        .append('rect')
        .attrs({
            width: d => node_width(d) + 2 * node_padding,
            height: d => get_node_height(d) + 2 * node_padding,
            'fill-opacity': 0,
            stroke: 'blue',
            'stroke-width': 2,
        })
        .on('click', bind_node_vis)

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked)

    simulation.force("link")
        .links(graph.links)

    function ticked() {
        link.attrs({
            x1: d => d.source.x + node_width(d.source),
            y1: d => d.source.y + get_node_height(d.source),
            x2: d => d.target.x,
            y2: d => d.target.y,
        })

        node.attr("transform", d => `translate(${d.x},${d.y})`)
    }

    function get_node_height(node_data) {
        return node_height
    }

    function node_width(node_data) {
        return node_data.repr.length * 8
    }

    function bind_node_vis(node_id) {
        node_id = node_id.id
        let node_data = nodes[node_id]

        let width = node_width(node_data)
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
})

function dragstarted(d) {
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
    console.log(d3.event)
    svg.attr("transform", d3.event.transform)
}
