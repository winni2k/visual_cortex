/**
 * Created by winni on 10/25/17.
 */
var node_height = 60

d3.json("graph.json", function (graph) {
    let svg = d3.select('svg')

    let nodes = {}
    for (let n of graph.nodes) {
        nodes[n.id] = n
    }
    let node_ids = graph.nodes.map(n => n.id)

    let node = svg.selectAll('.node')
        .data(node_ids)

    node.enter()
        .append("g")
        .attr('class', 'node')
        .merge(node) // update entering and existing elements
        .each(build_node)

    function node_width(node_data) {
        return node_data.repr.length * 8
    }

    function build_node(node_id, i) {
        let node_data = nodes[node_id]

        let node = d3.select(this)
            .attr('id', node_id)
            .attr('transform', `translate(100,${i * (node_height + 10) })`)

        let stroke_width = 2
        node
            .append('text')
            .text(node_data.repr)
            .attrs({y: 20, x: 5})
        node
            .append('rect')
            .attrs({
                width: node_width(node_data),
                height: node_height,
                'fill-opacity': 0,
                stroke: 'blue',
                'stroke-width': stroke_width,
            })
            .on('click', bind_node_vis)
    }

    function bind_node_vis(node_id, i) {
        console.log(`click! ${node_id} ${i}`)
        let node_data = nodes[node_id]

        let width = node_width(node_data)
        let chart = bb.generate({
            data: {
                type: "step",
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

//



