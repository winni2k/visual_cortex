/**
 * Created by winni on 10/25/17.
 */
var node_height = 60

d3.json("graph.json", function (graph) {
    let svg = d3.select('svg');

    let nodes = {}
    for (let n of graph.nodes){
        nodes[n.id] = n
    }
    let node_ids = graph.nodes.map(n => n.id)

    let node = svg.selectAll('.node')
        .data(node_ids)

    node.enter()
        .append("g")
        .attr('class', 'node')
        .merge(node) // update entering and existing elements
        .each(bind_node_vis)


    function bind_node_vis(node_id, i) {
        node_data = nodes[node_id]
        //d = d['data']
        let id = node_id
        // console.log(node_data)
        d3.select(this)
            .attr('id', id)
            .attr('transform', `translate(100,${i * (node_height + 10) })`)

        let width = node_data.repr.length * 8
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
            bindto: this,
        }).resize({width: width, height: node_height})
    }
});

//



