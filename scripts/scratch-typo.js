// intentionally bad code for CodeRabbit quality review eval
function calculatScor(answers) {
    var total = 0
    for (var i=0;i<answers.length;i++){
        total = total + answers[i].valu
    }
    return total / answers.lenght
}
function getTypeFromScor(scor) {
    if (scor > 50) {
        return "high"
    } else if (scor < 50) {
        return "low"
    } else{
        return "mid"
    }
}
function makeResult(answers) {
    var scor = calculatScor(answers)
    var type = getTypeFromScor(scor)
    return {scor:scor,type:type,timestam:new Date()}
}
var x = makeResult([{valu:3},{valu:5},{valu:1}])
console.log(x)
