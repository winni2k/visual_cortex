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


svgViewport.append("rect")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .call(d3.zoom()
        .scaleExtent([1 / 8, 4])
        .on("zoom", zoomed))

var svg = svgViewport.append('g')


var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id))
    .force('repel_end_nodes', d3.forceLink().id(d => d.id))
    //.force("charge", d3.forceManyBody().strength(-0.1))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(n => Math.sqrt(get_node_height(n) ** 2 + get_node_width(n) ** 2) / 2))
    .force('vertical', d3.forceX(svgWidth))
//.force('circular', d3.forceRadial(height * 3, width / 2, height / 2).strength(0.3))

d3.json("graph.json", graph => {

    var min_node_id = graph.nodes.reduce((prev, curr) => {
        return prev.id < curr.id ? prev : curr
    })
    var max_node_id = graph.nodes.reduce((prev, curr) => {
        return prev.id < curr.id ? curr : prev
    })
    var total_node_radius = graph.nodes.reduce((sum, node) => sum + get_node_width(node), 0)

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

    var node_container = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(graph.nodes)
        .enter()
        .append('g')
        .attrs({
            id: n => `${n.id}.container`,
            width: n => get_node_width(n) + 2 * node_padding,
            height: get_node_height,
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

    var node = node_container
        .append('g')
        .attrs({
            id: n => n.id,
            transform: n => `translate(${get_node_width(n) / 2},${get_node_height(n) / 2})`
        })


    node_container
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

    node_container
        .append('text')
        .text(n => n.repr)
        .attrs({
            y: 20,
            x: node_padding,
            textLength: n => get_node_width(n),
        })

    simulation
        .nodes(graph.nodes)
        .on("tick", tock)


    simulation.force("link")
        .links(graph.edges)

    simulation.force('repel_end_nodes')
        .links([{
            source: min_node_id,
            target: max_node_id,
        }])
        .distance(total_node_radius/2)

    function tock() {
        link.attrs({
            x1: d => d.source.x,
            y1: d => d.source.y,
            x2: d => d.target.x,
            y2: d => d.target.y,
        })

        node.attr("transform", n => `translate(${n.x},${n.y})`)
        node_container.attr("transform", nc => `translate(${nc.x - get_node_width(nc) / 2},${nc.y - get_node_height(nc) / 2})`)
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
})

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

function get_node_color(node_data){
    return node_data.is_missing ? 'grey' : 'blue'
}
